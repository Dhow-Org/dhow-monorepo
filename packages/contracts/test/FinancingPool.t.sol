// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { FinancingPool } from "../src/FinancingPool.sol";
import { InvoiceRegistry } from "../src/InvoiceRegistry.sol";
import { ReputationRegistry } from "../src/ReputationRegistry.sol";
import { IInvoiceRegistry } from "../src/interfaces/IInvoiceRegistry.sol";
import { IReputationRegistry } from "../src/interfaces/IReputationRegistry.sol";
import { TestERC20 } from "./mocks/TestERC20.sol";

contract FinancingPoolTest is Test {
    TestERC20 internal usdc;
    InvoiceRegistry internal registry;
    ReputationRegistry internal reputation;
    FinancingPool internal pool;

    address internal admin = makeAddr("admin");
    address internal operator = makeAddr("operator");
    address internal funder = makeAddr("funder");
    address internal funder2 = makeAddr("funder2");
    address internal sme = makeAddr("sme");
    address internal buyer = makeAddr("buyer");

    uint64 internal due;

    function setUp() public {
        usdc = new TestERC20("USD Coin", "USDC", 6);
        reputation = new ReputationRegistry(admin);
        registry = new InvoiceRegistry(admin);
        pool = new FinancingPool(
            admin,
            operator,
            IERC20(address(usdc)),
            IInvoiceRegistry(address(registry)),
            IReputationRegistry(address(reputation))
        );

        vm.startPrank(admin);
        registry.grantRole(registry.FINANCER_ROLE(), address(pool));
        registry.grantRole(registry.REGISTRAR_ROLE(), operator);
        registry.grantRole(registry.VERIFIER_ROLE(), operator);
        reputation.grantRole(reputation.ATTESTER_ROLE(), address(pool));
        pool.grantRole(pool.FUNDER_ROLE(), funder);
        pool.grantRole(pool.FUNDER_ROLE(), funder2);
        vm.stopPrank();

        due = uint64(block.timestamp + 60 days);

        usdc.mint(funder, 1_000_000e6);
        usdc.mint(funder2, 1_000_000e6);
        usdc.mint(buyer, 1_000_000e6);
    }

    function _deposit(address f, uint256 amt) internal {
        vm.startPrank(f);
        usdc.approve(address(pool), amt);
        pool.deposit(amt);
        vm.stopPrank();
    }

    function _registerVerified(uint256 amount, bytes32 ref) internal returns (uint256 id) {
        vm.startPrank(operator);
        id = registry.registerInvoice(sme, buyer, address(usdc), amount, due, ref, keccak256(abi.encode(ref)));
        registry.verifyInvoice(id);
        vm.stopPrank();
    }

    function _repay(address payer, uint256 advId, uint256 amount) internal {
        vm.startPrank(payer);
        usdc.approve(address(pool), amount);
        pool.repay(advId, amount);
        vm.stopPrank();
    }

    function test_deposit_setsLiquidity() public {
        _deposit(funder, 100_000e6);
        assertEq(pool.idleLiquidity(), 100_000e6);
        assertEq(pool.totalFunderPrincipal(), 100_000e6);
        assertEq(pool.totalAssets(), 100_000e6);
    }

    function test_disburse_movesFunds_updatesState() public {
        _deposit(funder, 100_000e6);
        uint256 invId = _registerVerified(10_000e6, "inv1");

        vm.prank(operator);
        uint256 advId = pool.disburse(invId, 8_500e6, 200); // 85% advance, 2% fee

        assertEq(usdc.balanceOf(sme), 8_500e6);
        assertEq(pool.idleLiquidity(), 91_500e6);
        assertEq(pool.outstandingPrincipal(), 8_500e6);

        FinancingPool.Advance memory a = pool.getAdvance(advId);
        assertEq(a.principal, 8_500e6);
        assertEq(a.feeAmount, 170e6);
        assertTrue(a.status == FinancingPool.AdvanceStatus.Active);
        assertTrue(registry.getInvoice(invId).status == IInvoiceRegistry.Status.Financed);
        assertEq(reputation.getScore(sme), 500);
    }

    function test_disburse_reverts() public {
        _deposit(funder, 100e6);
        uint256 invId = _registerVerified(10_000e6, "inv2");

        vm.prank(operator);
        vm.expectRevert(FinancingPool.FeeTooHigh.selector);
        pool.disburse(invId, 50e6, 4000);

        vm.prank(operator);
        vm.expectRevert(FinancingPool.InsufficientLiquidity.selector);
        pool.disburse(invId, 8_500e6, 200);

        _deposit(funder, 100_000e6);
        vm.prank(operator);
        vm.expectRevert(FinancingPool.AdvanceExceedsInvoice.selector);
        pool.disburse(invId, 20_000e6, 200);
    }

    function test_repay_full_onTime() public {
        _deposit(funder, 100_000e6);
        uint256 invId = _registerVerified(10_000e6, "inv3");
        vm.prank(operator);
        uint256 advId = pool.disburse(invId, 8_500e6, 200);

        _repay(buyer, advId, 8_670e6);

        assertTrue(pool.getAdvance(advId).status == FinancingPool.AdvanceStatus.Repaid);
        assertEq(pool.outstandingPrincipal(), 0);
        assertEq(pool.idleLiquidity(), 100_000e6);
        assertEq(pool.pendingFees(funder), 170e6);
        assertTrue(registry.getInvoice(invId).status == IInvoiceRegistry.Status.Repaid);
        assertEq(reputation.getScore(sme), 520); // +20 on time
    }

    function test_claimFees() public {
        _deposit(funder, 100_000e6);
        uint256 invId = _registerVerified(10_000e6, "inv4");
        vm.prank(operator);
        uint256 advId = pool.disburse(invId, 8_500e6, 200);
        _repay(buyer, advId, 8_670e6);

        vm.prank(funder);
        uint256 claimed = pool.claimFees();
        assertEq(claimed, 170e6);
        assertEq(usdc.balanceOf(funder), 1_000_000e6 - 100_000e6 + 170e6);
        assertEq(pool.pendingFees(funder), 0);
    }

    function test_repay_late_penalty() public {
        _deposit(funder, 100_000e6);
        uint256 invId = _registerVerified(10_000e6, "inv5");
        vm.prank(operator);
        uint256 advId = pool.disburse(invId, 8_500e6, 200);

        vm.warp(due + 1 days);
        _repay(buyer, advId, 8_670e6);

        assertEq(reputation.getScore(sme), 485); // -15 late
    }

    function test_default_realisesLoss() public {
        _deposit(funder, 100_000e6);
        uint256 invId = _registerVerified(10_000e6, "inv6");
        vm.prank(operator);
        uint256 advId = pool.disburse(invId, 8_500e6, 200);

        vm.prank(operator);
        pool.recordDefault(advId);

        assertEq(pool.outstandingPrincipal(), 0);
        assertEq(pool.idleLiquidity(), 91_500e6); // principal not recovered
        assertEq(pool.totalLosses(), 8_500e6);
        assertTrue(registry.getInvoice(invId).status == IInvoiceRegistry.Status.Defaulted);
        assertEq(reputation.getScore(sme), 400); // -100 default
    }

    function test_withdraw_boundedByIdle() public {
        _deposit(funder, 100_000e6);
        uint256 invId = _registerVerified(100_000e6, "inv7");
        vm.prank(operator);
        pool.disburse(invId, 90_000e6, 200);

        vm.prank(funder);
        vm.expectRevert(FinancingPool.InsufficientLiquidity.selector);
        pool.withdraw(50_000e6);

        vm.prank(funder);
        pool.withdraw(10_000e6);
        assertEq(pool.idleLiquidity(), 0);
        assertEq(pool.funderOf(funder).principal, 90_000e6);
    }

    function test_multiFunder_feeProRata() public {
        _deposit(funder, 60_000e6);
        _deposit(funder2, 40_000e6);
        uint256 invId = _registerVerified(100_000e6, "inv8");
        vm.prank(operator);
        uint256 advId = pool.disburse(invId, 50_000e6, 200); // fee 1000e6

        _repay(buyer, advId, 51_000e6);

        assertEq(pool.pendingFees(funder), 600e6);
        assertEq(pool.pendingFees(funder2), 400e6);
    }

    function test_pause_blocksDisburse() public {
        _deposit(funder, 100_000e6);
        uint256 invId = _registerVerified(10_000e6, "inv9");
        vm.prank(admin);
        pool.pause();
        vm.prank(operator);
        vm.expectRevert();
        pool.disburse(invId, 8_500e6, 200);
    }
}
