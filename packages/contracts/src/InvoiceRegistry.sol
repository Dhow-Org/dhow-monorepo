// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IInvoiceRegistry } from "./interfaces/IInvoiceRegistry.sol";

/// @title InvoiceRegistry
/// @notice Registry of tokenized trade receivables with lifecycle management and
///         anti-double-financing via a unique external reference. Holds no funds.
///         REGISTRAR_ROLE registers invoices, VERIFIER_ROLE verifies them, and
///         FINANCER_ROLE (the FinancingPool) transitions financed/repaid/defaulted.
contract InvoiceRegistry is AccessControl, IInvoiceRegistry {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant FINANCER_ROLE = keccak256("FINANCER_ROLE");

    uint256 private _nextId = 1;
    mapping(uint256 => Invoice) private _invoices;

    /// @notice Tracks real-world references already used, to prevent financing the same invoice twice.
    mapping(bytes32 => bool) public refUsed;

    event InvoiceRegistered(
        uint256 indexed id,
        address indexed supplier,
        address indexed debtor,
        address asset,
        uint256 amount,
        uint64 dueDate,
        bytes32 externalRef,
        bytes32 docHash
    );
    event InvoiceVerified(uint256 indexed id);
    event InvoiceFinanced(uint256 indexed id);
    event InvoiceRepaid(uint256 indexed id);
    event InvoiceDefaulted(uint256 indexed id);
    event InvoiceCancelled(uint256 indexed id);

    error ZeroAddress();
    error ZeroAmount();
    error InvalidDueDate();
    error InvalidRef();
    error RefAlreadyUsed(bytes32 ref);
    error UnknownInvoice(uint256 id);
    error InvalidStatus(uint256 id, Status current);

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function registerInvoice(
        address supplier,
        address debtor,
        address asset,
        uint256 amount,
        uint64 dueDate,
        bytes32 externalRef,
        bytes32 docHash
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 id) {
        if (supplier == address(0) || asset == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (dueDate <= block.timestamp) revert InvalidDueDate();
        if (externalRef == bytes32(0)) revert InvalidRef();
        if (refUsed[externalRef]) revert RefAlreadyUsed(externalRef);

        refUsed[externalRef] = true;
        id = _nextId++;
        _invoices[id] = Invoice({
            supplier: supplier,
            debtor: debtor,
            asset: asset,
            amount: amount,
            dueDate: dueDate,
            createdAt: uint64(block.timestamp),
            status: Status.Registered,
            docHash: docHash,
            externalRef: externalRef
        });
        emit InvoiceRegistered(id, supplier, debtor, asset, amount, dueDate, externalRef, docHash);
    }

    function verifyInvoice(uint256 id) external onlyRole(VERIFIER_ROLE) {
        Invoice storage inv = _get(id);
        if (inv.status != Status.Registered) revert InvalidStatus(id, inv.status);
        inv.status = Status.Verified;
        emit InvoiceVerified(id);
    }

    function cancelInvoice(uint256 id) external onlyRole(REGISTRAR_ROLE) {
        Invoice storage inv = _get(id);
        if (inv.status != Status.Registered && inv.status != Status.Verified) {
            revert InvalidStatus(id, inv.status);
        }
        inv.status = Status.Cancelled;
        emit InvoiceCancelled(id);
    }

    function markFinanced(uint256 id) external onlyRole(FINANCER_ROLE) {
        Invoice storage inv = _get(id);
        if (inv.status != Status.Verified) revert InvalidStatus(id, inv.status);
        inv.status = Status.Financed;
        emit InvoiceFinanced(id);
    }

    function markRepaid(uint256 id) external onlyRole(FINANCER_ROLE) {
        Invoice storage inv = _get(id);
        if (inv.status != Status.Financed) revert InvalidStatus(id, inv.status);
        inv.status = Status.Repaid;
        emit InvoiceRepaid(id);
    }

    function markDefaulted(uint256 id) external onlyRole(FINANCER_ROLE) {
        Invoice storage inv = _get(id);
        if (inv.status != Status.Financed) revert InvalidStatus(id, inv.status);
        inv.status = Status.Defaulted;
        emit InvoiceDefaulted(id);
    }

    function getInvoice(uint256 id) external view returns (Invoice memory) {
        return _get(id);
    }

    function isFinanceable(uint256 id) external view returns (bool) {
        return _invoices[id].status == Status.Verified;
    }

    function _get(uint256 id) private view returns (Invoice storage inv) {
        inv = _invoices[id];
        if (inv.status == Status.None) revert UnknownInvoice(id);
    }
}
