// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";
import {FinancingPool} from "../src/FinancingPool.sol";
import {IInvoiceRegistry} from "../src/interfaces/IInvoiceRegistry.sol";
import {IReputationRegistry} from "../src/interfaces/IReputationRegistry.sol";
import {TestERC20} from "../test/mocks/TestERC20.sol";

/// @notice LOCAL-ONLY deploy for the Anvil e2e: deploys a test USDC + the three
///         contracts, wires roles, and seeds pool liquidity. Not for real networks.
contract DeployLocal is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        TestERC20 usdc = new TestERC20("USD Coin", "USDC", 6);
        ReputationRegistry reputation = new ReputationRegistry(deployer);
        InvoiceRegistry registry = new InvoiceRegistry(deployer);
        FinancingPool pool = new FinancingPool(
            deployer,
            deployer, // operator == deployer for the local e2e
            IERC20(address(usdc)),
            IInvoiceRegistry(address(registry)),
            IReputationRegistry(address(reputation))
        );

        registry.grantRole(registry.FINANCER_ROLE(), address(pool));
        registry.grantRole(registry.REGISTRAR_ROLE(), deployer);
        registry.grantRole(registry.VERIFIER_ROLE(), deployer);
        reputation.grantRole(reputation.ATTESTER_ROLE(), address(pool));
        pool.grantRole(pool.FUNDER_ROLE(), deployer);

        // Seed liquidity so disbursement works, and leave headroom for repayment escrow.
        usdc.mint(deployer, 1_000_000e6);
        usdc.approve(address(pool), type(uint256).max);
        pool.deposit(500_000e6);

        vm.stopBroadcast();

        console2.log("USDC_ADDRESS=", address(usdc));
        console2.log("INVOICE_REGISTRY_ADDRESS=", address(registry));
        console2.log("FINANCING_POOL_ADDRESS=", address(pool));
        console2.log("REPUTATION_REGISTRY_ADDRESS=", address(reputation));
    }
}
