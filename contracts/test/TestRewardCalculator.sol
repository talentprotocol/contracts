// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IRewardParameters, RewardCalculator} from "../staking_helpers/RewardCalculator.sol";

contract TestRewardCalculator is RewardCalculator {
    uint256 public override(IRewardParameters) start;
    uint256 public override(IRewardParameters) end;
    uint256 public override(IRewardParameters) rewardsMax;
    uint256 public override(IRewardParameters) rewardsGiven;
    uint256 public override(IRewardParameters) totalShares;
    uint256 public override(IRewardParameters) totalAdjustedShares;

    constructor(
        uint256 _start,
        uint256 _end,
        uint256 _rewardsMax,
        uint256 _rewardsGiven,
        uint256 _totalShares,
        uint256 _totalAdjustedShares
    ) {
        start = _start;
        end = _end;
        rewardsMax = _rewardsMax;
        rewardsGiven = _rewardsGiven;
        _totalShares = _totalShares;
        totalAdjustedShares = _totalAdjustedShares;
    }

    function test_MUL() public pure returns (uint256) {
        return MUL;
    }

    function test_calculateGlobalReward(uint256 _start, uint256 _end) public view returns (uint256) {
        return calculateGlobalReward(_start, _end);
    }

    function test_calculateReward(
        uint256 _shares,
        uint256 _start,
        uint256 _end,
        uint256 _stakerWeight,
        uint256 _talentWeight
    ) public pure returns (uint256, uint256) {
        return calculateReward(_shares, _start, _end, _stakerWeight, _talentWeight);
    }

    function test_calculateTalentShare(
        uint256 _rewards,
        uint256 _stakerWeight,
        uint256 _talentWeight
    ) public pure returns (uint256) {
        return _calculateTalentShare(_rewards, _stakerWeight, _talentWeight);
    }

    function test_truncatePeriod(uint256 _start, uint256 _end) public view returns (uint256, uint256) {
        return _truncatePeriod(_start, _end);
    }

    function test_periodToPercents(uint256 _start, uint256 _end) public view returns (uint256, uint256) {
        return _periodToPercents(_start, _end);
    }

    function test_curvePercentage(uint256 _start, uint256 _end) public pure returns (uint256) {
        return _curvePercentage(_start, _end);
    }

    function test_integralAt(uint256 _x) public pure returns (int256) {
        return _integralAt(_x);
    }

    function rewardsLeft() public view override(IRewardParameters) returns (uint256) {
        return rewardsMax - rewardsGiven;
    }

    function multiplier() public pure returns (uint256) {
        return MUL;
    }
}
