// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {IRewardParameters, RewardCalculator} from "../staking/RewardCalculator.sol";

contract TestRewardCalculator is RewardCalculator {
    uint256 public override(IRewardParameters) start;
    uint256 public override(IRewardParameters) end;
    uint256 public override(IRewardParameters) rewardsMax;
    uint256 public override(IRewardParameters) rewardsGiven;
    uint256 public override(IRewardParameters) totalShares;

    constructor(
        uint256 _start,
        uint256 _end,
        uint256 _rewardsMax,
        uint256 _rewardsGiven,
        uint256 _totalShares
    ) {
        start = _start;
        end = _end;
        rewardsMax = _rewardsMax;
        rewardsGiven = _rewardsGiven;
        _totalShares = _totalShares;
    }

    function test_truncatePeriod(uint256 _start, uint256 _end) public view returns (uint256, uint256) {
        return _truncatePeriod(_start, _end);
    }

    function test_periodToPercents(uint256 _start, uint256 _end) public view returns (uint256, uint256) {
        return _periodToPercents(_start, _end);
    }

    function rewardsLeft() public view override(IRewardParameters) returns (uint256) {
        return rewardsMax - rewardsGiven;
    }
}
