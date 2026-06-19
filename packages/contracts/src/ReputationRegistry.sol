// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IReputationRegistry } from "./interfaces/IReputationRegistry.sol";

/// @title ReputationRegistry
/// @notice Records SME financing/repayment/default events and maintains a 0-1000 cash-flow
///         credit score. Written only by ATTESTER_ROLE (the FinancingPool and the backend
///         underwriting operator). Holds no funds.
contract ReputationRegistry is AccessControl, IReputationRegistry {
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");

    uint256 public constant MIN_SCORE = 0;
    uint256 public constant MAX_SCORE = 1000;
    uint256 public constant INITIAL_SCORE = 500;

    struct ScoringParams {
        uint16 onTimeBonus;
        uint16 latePenalty;
        uint16 defaultPenalty;
    }

    struct Reputation {
        bool initialized;
        uint256 score;
        uint64 financedCount;
        uint64 onTimeCount;
        uint64 lateCount;
        uint64 defaultCount;
        uint256 totalFinanced;
        uint256 totalRepaid;
        uint64 lastUpdated;
    }

    ScoringParams public params;
    mapping(address => Reputation) private _reputations;

    event ReputationInitialized(address indexed sme, uint256 score);
    event FinancingRecorded(address indexed sme, uint256 amount, uint64 financedCount);
    event RepaymentRecorded(address indexed sme, uint256 amount, bool onTime, uint256 newScore);
    event DefaultRecorded(address indexed sme, uint256 amount, uint256 newScore);
    event ScoringParamsUpdated(uint16 onTimeBonus, uint16 latePenalty, uint16 defaultPenalty);

    error ZeroAddress();
    error InvalidParams();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        params = ScoringParams({ onTimeBonus: 20, latePenalty: 15, defaultPenalty: 100 });
    }

    /// @notice Update score deltas. Bounded by MAX_SCORE to prevent nonsensical config.
    function setScoringParams(uint16 onTimeBonus, uint16 latePenalty, uint16 defaultPenalty)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (onTimeBonus > MAX_SCORE || latePenalty > MAX_SCORE || defaultPenalty > MAX_SCORE) {
            revert InvalidParams();
        }
        params = ScoringParams({
            onTimeBonus: onTimeBonus, latePenalty: latePenalty, defaultPenalty: defaultPenalty
        });
        emit ScoringParamsUpdated(onTimeBonus, latePenalty, defaultPenalty);
    }

    function recordFinancing(address sme, uint256 amount) external onlyRole(ATTESTER_ROLE) {
        if (sme == address(0)) revert ZeroAddress();
        Reputation storage r = _ensureInitialized(sme);
        r.financedCount += 1;
        r.totalFinanced += amount;
        r.lastUpdated = uint64(block.timestamp);
        emit FinancingRecorded(sme, amount, r.financedCount);
    }

    function recordRepayment(address sme, uint256 amount, bool onTime) external onlyRole(ATTESTER_ROLE) {
        if (sme == address(0)) revert ZeroAddress();
        Reputation storage r = _ensureInitialized(sme);
        r.totalRepaid += amount;
        if (onTime) {
            r.onTimeCount += 1;
            r.score = _add(r.score, params.onTimeBonus);
        } else {
            r.lateCount += 1;
            r.score = _sub(r.score, params.latePenalty);
        }
        r.lastUpdated = uint64(block.timestamp);
        emit RepaymentRecorded(sme, amount, onTime, r.score);
    }

    function recordDefault(address sme, uint256 amount) external onlyRole(ATTESTER_ROLE) {
        if (sme == address(0)) revert ZeroAddress();
        Reputation storage r = _ensureInitialized(sme);
        r.defaultCount += 1;
        r.score = _sub(r.score, params.defaultPenalty);
        r.lastUpdated = uint64(block.timestamp);
        emit DefaultRecorded(sme, amount, r.score);
    }

    function getReputation(address sme) external view returns (Reputation memory) {
        return _reputations[sme];
    }

    function getScore(address sme) external view returns (uint256) {
        Reputation storage r = _reputations[sme];
        return r.initialized ? r.score : INITIAL_SCORE;
    }

    /// @notice 0 Bronze, 1 Silver, 2 Gold, 3 Platinum.
    function tierOf(address sme) external view returns (uint8) {
        uint256 s = _reputations[sme].initialized ? _reputations[sme].score : INITIAL_SCORE;
        if (s >= 850) return 3;
        if (s >= 600) return 2;
        if (s >= 300) return 1;
        return 0;
    }

    function _ensureInitialized(address sme) private returns (Reputation storage r) {
        r = _reputations[sme];
        if (!r.initialized) {
            r.initialized = true;
            r.score = INITIAL_SCORE;
            r.lastUpdated = uint64(block.timestamp);
            emit ReputationInitialized(sme, INITIAL_SCORE);
        }
    }

    function _add(uint256 score, uint256 delta) private pure returns (uint256) {
        uint256 s = score + delta;
        return s > MAX_SCORE ? MAX_SCORE : s;
    }

    function _sub(uint256 score, uint256 delta) private pure returns (uint256) {
        return score > delta ? score - delta : MIN_SCORE;
    }
}
