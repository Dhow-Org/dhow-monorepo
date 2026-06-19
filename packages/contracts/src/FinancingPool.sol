// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IInvoiceRegistry } from "./interfaces/IInvoiceRegistry.sol";
import { IReputationRegistry } from "./interfaces/IReputationRegistry.sol";

/// @title FinancingPool
/// @notice Holds licensed-funder liquidity (USDC) and disburses receivable advances against
///         verified invoices. The advance percentage and fee are decided OFF-CHAIN by the
///         underwriting engine and passed in by an OPERATOR; this contract enforces invariants,
///         accounting, and settlement. Repayment splits principal (back to liquidity) and fee
///         (accrued pro-rata to funders). Defaults realise a loss against the pool.
/// @dev    Non-custodial w.r.t. SMEs: only funder liquidity lives here. Funders are whitelisted
///         (FUNDER_ROLE) to satisfy the embedded-on-licensed-partner regulatory model.
contract FinancingPool is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE");

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_FEE_BPS = 3_000; // 30% hard cap (sanity bound)
    uint256 private constant ACC_PRECISION = 1e18;

    IERC20 public immutable asset;
    IInvoiceRegistry public immutable invoiceRegistry;
    IReputationRegistry public immutable reputation;

    enum AdvanceStatus {
        None,
        Active,
        Repaid,
        Defaulted
    }

    struct Advance {
        uint256 invoiceId;
        address sme;
        uint256 principal;
        uint256 feeAmount;
        uint64 dueDate;
        uint256 repaid;
        AdvanceStatus status;
        uint64 disbursedAt;
    }

    struct Funder {
        uint256 principal;
        uint256 feeDebt; // accumulator baseline
        uint256 claimable; // settled-but-unclaimed fees
    }

    uint256 public nextAdvanceId = 1;
    mapping(uint256 => Advance) private _advances;

    // Pool accounting
    uint256 public idleLiquidity; // USDC available to lend (principal only)
    uint256 public outstandingPrincipal; // USDC currently deployed in active advances
    uint256 public totalFunderPrincipal; // nominal funder principal
    uint256 public totalLosses; // realised principal losses from defaults
    uint256 public accFeePerPrincipal; // scaled by ACC_PRECISION
    uint256 public unclaimedFees; // fees owed to funders (not part of idleLiquidity)

    mapping(address => Funder) private _funders;

    event Deposited(address indexed funder, uint256 amount);
    event Withdrawn(address indexed funder, uint256 amount);
    event FeesClaimed(address indexed funder, uint256 amount);
    event AdvanceDisbursed(
        uint256 indexed advanceId,
        uint256 indexed invoiceId,
        address indexed sme,
        uint256 principal,
        uint256 fee,
        uint64 dueDate
    );
    event RepaymentReceived(
        uint256 indexed advanceId, address indexed payer, uint256 amount, uint256 totalRepaid
    );
    event AdvanceRepaid(uint256 indexed advanceId, address indexed sme, uint256 totalDue, bool onTime);
    event AdvanceDefaulted(uint256 indexed advanceId, address indexed sme, uint256 lossPrincipal);

    error ZeroAddress();
    error ZeroAmount();
    error FeeTooHigh();
    error InvoiceNotFinanceable(uint256 invoiceId);
    error AssetMismatch();
    error AdvanceExceedsInvoice();
    error InsufficientLiquidity();
    error InsufficientFunderPrincipal();
    error AdvanceNotActive(uint256 advanceId);

    constructor(
        address admin,
        address operator,
        IERC20 asset_,
        IInvoiceRegistry invoiceRegistry_,
        IReputationRegistry reputation_
    ) {
        if (
            admin == address(0) || operator == address(0) || address(asset_) == address(0)
                || address(invoiceRegistry_) == address(0) || address(reputation_) == address(0)
        ) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
        asset = asset_;
        invoiceRegistry = invoiceRegistry_;
        reputation = reputation_;
    }

    // --------------------------------------------------------------------- //
    //                              Funder ops                               //
    // --------------------------------------------------------------------- //

    function deposit(uint256 amount) external onlyRole(FUNDER_ROLE) nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        _settleFunder(msg.sender);
        asset.safeTransferFrom(msg.sender, address(this), amount);
        Funder storage f = _funders[msg.sender];
        f.principal += amount;
        totalFunderPrincipal += amount;
        idleLiquidity += amount;
        _resetFeeDebt(f);
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Funder storage f = _funders[msg.sender];
        if (amount > f.principal) revert InsufficientFunderPrincipal();
        if (amount > idleLiquidity) revert InsufficientLiquidity();
        _settleFunder(msg.sender);
        f.principal -= amount;
        totalFunderPrincipal -= amount;
        idleLiquidity -= amount;
        _resetFeeDebt(f);
        asset.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function claimFees() external nonReentrant returns (uint256 amount) {
        _settleFunder(msg.sender);
        Funder storage f = _funders[msg.sender];
        amount = f.claimable;
        if (amount == 0) return 0;
        f.claimable = 0;
        unclaimedFees -= amount;
        asset.safeTransfer(msg.sender, amount);
        emit FeesClaimed(msg.sender, amount);
    }

    // --------------------------------------------------------------------- //
    //                          Financing lifecycle                          //
    // --------------------------------------------------------------------- //

    /// @notice Disburse an advance against a VERIFIED invoice. Underwriting (advanceAmount, feeBps)
    ///         is decided off-chain; this enforces invariants and moves funds to the SME.
    function disburse(uint256 invoiceId, uint256 advanceAmount, uint256 feeBps)
        external
        onlyRole(OPERATOR_ROLE)
        nonReentrant
        whenNotPaused
        returns (uint256 advanceId)
    {
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (advanceAmount == 0) revert ZeroAmount();

        IInvoiceRegistry.Invoice memory inv = invoiceRegistry.getInvoice(invoiceId);
        if (inv.status != IInvoiceRegistry.Status.Verified) revert InvoiceNotFinanceable(invoiceId);
        if (inv.asset != address(asset)) revert AssetMismatch();
        if (advanceAmount > inv.amount) revert AdvanceExceedsInvoice();
        if (advanceAmount > idleLiquidity) revert InsufficientLiquidity();

        uint256 fee = (advanceAmount * feeBps) / BPS;

        // effects
        idleLiquidity -= advanceAmount;
        outstandingPrincipal += advanceAmount;
        advanceId = nextAdvanceId++;
        _advances[advanceId] = Advance({
            invoiceId: invoiceId,
            sme: inv.supplier,
            principal: advanceAmount,
            feeAmount: fee,
            dueDate: inv.dueDate,
            repaid: 0,
            status: AdvanceStatus.Active,
            disbursedAt: uint64(block.timestamp)
        });

        // interactions
        invoiceRegistry.markFinanced(invoiceId);
        reputation.recordFinancing(inv.supplier, advanceAmount);
        asset.safeTransfer(inv.supplier, advanceAmount);

        emit AdvanceDisbursed(advanceId, invoiceId, inv.supplier, advanceAmount, fee, inv.dueDate);
    }

    /// @notice Repay (in part or full) an active advance. Repayment always allowed, even when paused.
    ///         The caller (buyer, SME, or operator-controlled escrow) must have approved `amount`.
    function repay(uint256 advanceId, uint256 amount) external nonReentrant {
        Advance storage a = _advances[advanceId];
        if (a.status != AdvanceStatus.Active) revert AdvanceNotActive(advanceId);
        if (amount == 0) revert ZeroAmount();

        uint256 totalDue = a.principal + a.feeAmount;
        uint256 remaining = totalDue - a.repaid;
        if (amount > remaining) amount = remaining;

        asset.safeTransferFrom(msg.sender, address(this), amount);
        a.repaid += amount;
        emit RepaymentReceived(advanceId, msg.sender, amount, a.repaid);

        if (a.repaid >= totalDue) {
            a.status = AdvanceStatus.Repaid;
            outstandingPrincipal -= a.principal;
            idleLiquidity += a.principal;
            _accrueFees(a.feeAmount);

            bool onTime = block.timestamp <= a.dueDate;
            invoiceRegistry.markRepaid(a.invoiceId);
            reputation.recordRepayment(a.sme, totalDue, onTime);

            emit AdvanceRepaid(advanceId, a.sme, totalDue, onTime);
        }
    }

    /// @notice Mark an active advance defaulted. Realises the unrepaid principal as a pool loss.
    function recordDefault(uint256 advanceId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        Advance storage a = _advances[advanceId];
        if (a.status != AdvanceStatus.Active) revert AdvanceNotActive(advanceId);

        uint256 principalRecovered = a.repaid > a.principal ? a.principal : a.repaid;
        uint256 feePaid = a.repaid - principalRecovered;
        uint256 lossPrincipal = a.principal - principalRecovered;

        a.status = AdvanceStatus.Defaulted;
        outstandingPrincipal -= a.principal;
        idleLiquidity += principalRecovered;
        totalLosses += lossPrincipal;
        if (feePaid > 0) _accrueFees(feePaid);

        invoiceRegistry.markDefaulted(a.invoiceId);
        reputation.recordDefault(a.sme, lossPrincipal);

        emit AdvanceDefaulted(advanceId, a.sme, lossPrincipal);
    }

    // --------------------------------------------------------------------- //
    //                                Admin                                  //
    // --------------------------------------------------------------------- //

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // --------------------------------------------------------------------- //
    //                                Views                                  //
    // --------------------------------------------------------------------- //

    function getAdvance(uint256 advanceId) external view returns (Advance memory) {
        return _advances[advanceId];
    }

    function funderOf(address funder) external view returns (Funder memory) {
        return _funders[funder];
    }

    /// @notice Total fees a funder can currently claim (settled + accrued-but-unsettled).
    function pendingFees(address funder) external view returns (uint256) {
        Funder storage f = _funders[funder];
        uint256 accumulated = (f.principal * accFeePerPrincipal) / ACC_PRECISION;
        uint256 pending = accumulated > f.feeDebt ? accumulated - f.feeDebt : 0;
        return f.claimable + pending;
    }

    /// @notice Total principal value tracked by the pool (idle + deployed).
    function totalAssets() external view returns (uint256) {
        return idleLiquidity + outstandingPrincipal;
    }

    // --------------------------------------------------------------------- //
    //                               Internals                               //
    // --------------------------------------------------------------------- //

    function _settleFunder(address funder) private {
        Funder storage f = _funders[funder];
        if (f.principal == 0) return;
        uint256 accumulated = (f.principal * accFeePerPrincipal) / ACC_PRECISION;
        if (accumulated > f.feeDebt) {
            f.claimable += accumulated - f.feeDebt;
            f.feeDebt = accumulated;
        }
    }

    function _resetFeeDebt(Funder storage f) private {
        f.feeDebt = (f.principal * accFeePerPrincipal) / ACC_PRECISION;
    }

    function _accrueFees(uint256 fee) private {
        if (fee == 0) return;
        if (totalFunderPrincipal == 0) {
            // No funders to receive (defensive); benefit the pool's idle liquidity instead.
            idleLiquidity += fee;
            return;
        }
        accFeePerPrincipal += (fee * ACC_PRECISION) / totalFunderPrincipal;
        unclaimedFees += fee;
    }
}
