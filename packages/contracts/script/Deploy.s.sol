// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";
import {FinancingPool} from "../src/FinancingPool.sol";
import {IInvoiceRegistry} from "../src/interfaces/IInvoiceRegistry.sol";
import {IReputationRegistry} from "../src/interfaces/IReputationRegistry.sol";

/// @notice Deploys the three contracts and wires inter-contract roles. All addresses come from env.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.addr(pk);
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        address funder = vm.envAddress("FUNDER_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(pk);

        ReputationRegistry reputation = new ReputationRegistry(admin);
        InvoiceRegistry registry = new InvoiceRegistry(admin);
        FinancingPool pool = new FinancingPool(
            admin, operator, IERC20(usdc), IInvoiceRegistry(address(registry)), IReputationRegistry(address(reputation))
        );

        // Inter-contract wiring: the pool drives invoice + reputation state transitions.
        registry.grantRole(registry.FINANCER_ROLE(), address(pool));
        registry.grantRole(registry.REGISTRAR_ROLE(), operator);
        registry.grantRole(registry.VERIFIER_ROLE(), operator);
        reputation.grantRole(reputation.ATTESTER_ROLE(), address(pool));
        reputation.grantRole(reputation.ATTESTER_ROLE(), operator);
        pool.grantRole(pool.FUNDER_ROLE(), funder);

        vm.stopBroadcast();

        console2.log("ReputationRegistry:", address(reputation));
        console2.log("InvoiceRegistry:   ", address(registry));
        console2.log("FinancingPool:     ", address(pool));
    }
}
