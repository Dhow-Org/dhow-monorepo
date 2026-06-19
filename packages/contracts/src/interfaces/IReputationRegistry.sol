// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title IReputationRegistry
/// @notice On-chain attestations of SME financing/repayment behaviour → cash-flow credit score.
interface IReputationRegistry {
    function recordFinancing(address sme, uint256 amount) external;

    function recordRepayment(address sme, uint256 amount, bool onTime) external;

    function recordDefault(address sme, uint256 amount) external;

    function getScore(address sme) external view returns (uint256);
}
