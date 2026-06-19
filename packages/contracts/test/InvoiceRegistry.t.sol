// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { InvoiceRegistry } from "../src/InvoiceRegistry.sol";
import { IInvoiceRegistry } from "../src/interfaces/IInvoiceRegistry.sol";

contract InvoiceRegistryTest is Test {
    InvoiceRegistry internal reg;
    address internal admin = makeAddr("admin");
    address internal registrar = makeAddr("registrar");
    address internal verifier = makeAddr("verifier");
    address internal financer = makeAddr("financer");
    address internal supplier = makeAddr("supplier");
    address internal buyer = makeAddr("buyer");
    address internal asset = makeAddr("usdc");

    uint64 internal due;

    function setUp() public {
        reg = new InvoiceRegistry(admin);
        vm.startPrank(admin);
        reg.grantRole(reg.REGISTRAR_ROLE(), registrar);
        reg.grantRole(reg.VERIFIER_ROLE(), verifier);
        reg.grantRole(reg.FINANCER_ROLE(), financer);
        vm.stopPrank();
        due = uint64(block.timestamp + 30 days);
    }

    function _register(bytes32 ref) internal returns (uint256 id) {
        vm.prank(registrar);
        id = reg.registerInvoice(supplier, buyer, asset, 1000e6, due, ref, keccak256("doc"));
    }

    function test_register_and_get() public {
        uint256 id = _register("ref1");
        IInvoiceRegistry.Invoice memory inv = reg.getInvoice(id);
        assertEq(inv.supplier, supplier);
        assertEq(inv.amount, 1000e6);
        assertTrue(inv.status == IInvoiceRegistry.Status.Registered);
        assertTrue(reg.refUsed("ref1"));
    }

    function test_revert_duplicateRef() public {
        _register("ref1");
        vm.prank(registrar);
        vm.expectRevert(abi.encodeWithSelector(InvoiceRegistry.RefAlreadyUsed.selector, bytes32("ref1")));
        reg.registerInvoice(supplier, buyer, asset, 1, due, "ref1", bytes32(0));
    }

    function test_revert_zeroAmount_and_pastDue() public {
        vm.prank(registrar);
        vm.expectRevert(InvoiceRegistry.ZeroAmount.selector);
        reg.registerInvoice(supplier, buyer, asset, 0, due, "r", bytes32(0));

        vm.prank(registrar);
        vm.expectRevert(InvoiceRegistry.InvalidDueDate.selector);
        reg.registerInvoice(supplier, buyer, asset, 1, uint64(block.timestamp), "r2", bytes32(0));
    }

    function test_lifecycle_register_verify_finance_repay() public {
        uint256 id = _register("ref1");
        assertFalse(reg.isFinanceable(id));

        vm.prank(verifier);
        reg.verifyInvoice(id);
        assertTrue(reg.isFinanceable(id));

        vm.prank(financer);
        reg.markFinanced(id);
        assertTrue(reg.getInvoice(id).status == IInvoiceRegistry.Status.Financed);

        vm.prank(financer);
        reg.markRepaid(id);
        assertTrue(reg.getInvoice(id).status == IInvoiceRegistry.Status.Repaid);
    }

    function test_revert_financeBeforeVerify() public {
        uint256 id = _register("ref1");
        vm.prank(financer);
        vm.expectRevert(
            abi.encodeWithSelector(
                InvoiceRegistry.InvalidStatus.selector, id, IInvoiceRegistry.Status.Registered
            )
        );
        reg.markFinanced(id);
    }

    function test_cancel() public {
        uint256 id = _register("ref1");
        vm.prank(registrar);
        reg.cancelInvoice(id);
        assertTrue(reg.getInvoice(id).status == IInvoiceRegistry.Status.Cancelled);
    }

    function test_revert_onlyRoles() public {
        uint256 id = _register("ref1");
        vm.expectRevert();
        reg.verifyInvoice(id); // caller has no VERIFIER_ROLE
    }
}
