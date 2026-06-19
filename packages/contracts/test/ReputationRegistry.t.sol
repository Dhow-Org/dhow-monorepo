// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";

contract ReputationRegistryTest is Test {
    ReputationRegistry internal rep;
    address internal admin = makeAddr("admin");
    address internal attester = makeAddr("attester");
    address internal sme = makeAddr("sme");

    function setUp() public {
        rep = new ReputationRegistry(admin);
        vm.startPrank(admin);
        rep.grantRole(rep.ATTESTER_ROLE(), attester);
        vm.stopPrank();
    }

    function test_DefaultScoreBeforeInit() public view {
        assertEq(rep.getScore(sme), 500);
        assertEq(rep.tierOf(sme), 1); // 500 -> Silver
    }

    function test_RecordFinancing_initializes() public {
        vm.prank(attester);
        rep.recordFinancing(sme, 1000e6);
        ReputationRegistry.Reputation memory r = rep.getReputation(sme);
        assertTrue(r.initialized);
        assertEq(r.score, 500);
        assertEq(r.financedCount, 1);
        assertEq(r.totalFinanced, 1000e6);
    }

    function test_OnTimeRepayment_increases_cappedAt1000() public {
        vm.startPrank(attester);
        for (uint256 i = 0; i < 30; i++) {
            rep.recordRepayment(sme, 100e6, true);
        }
        vm.stopPrank();
        assertEq(rep.getScore(sme), 1000);
        assertEq(rep.tierOf(sme), 3); // Platinum
    }

    function test_LateAndDefault_decrease_flooredAt0() public {
        vm.startPrank(attester);
        rep.recordDefault(sme, 1); // 500 -> 400
        assertEq(rep.getScore(sme), 400);
        for (uint256 i = 0; i < 40; i++) {
            rep.recordRepayment(sme, 1, false); // -15 each
        }
        vm.stopPrank();
        assertEq(rep.getScore(sme), 0);
        assertEq(rep.tierOf(sme), 0); // Bronze
    }

    function test_OnlyAttester_canRecord() public {
        vm.expectRevert();
        rep.recordFinancing(sme, 1);
    }

    function test_SetParams_onlyAdmin_andBounds() public {
        vm.prank(admin);
        rep.setScoringParams(50, 25, 200);
        (uint16 b, uint16 l, uint16 d) = rep.params();
        assertEq(b, 50);
        assertEq(l, 25);
        assertEq(d, 200);

        vm.prank(admin);
        vm.expectRevert(ReputationRegistry.InvalidParams.selector);
        rep.setScoringParams(2000, 1, 1);
    }
}
