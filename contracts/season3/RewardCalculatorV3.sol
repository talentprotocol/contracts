// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

interface IRewardCalculatorV3 {
    /// Return variable MUL
    function mul() external view returns (uint256);

    /// Calculate the spefiic reward
    function calculateReward(uint256 _shares, uint256 _stakerS, uint256 _currentS) external view returns (uint256);

    /// Calculate the global reward
    function calculateGlobalReward(
        uint256 stakingStart,
        uint256 stakingEnd,
        uint256 _start,
        uint256 _end,
        uint256 rewardsMax
    ) external view returns (uint256);

    /// sqrt function
    function sqrt(uint256 x) external pure returns (uint256);
}

/// @title Mathematical model that calculates staking rewards
///
/// @notice Rewards are calculated with a few variables in mind:
///   1. A downward polynomial curve that rewards early stakers more than later ones
///   2. The relative weight of a stake at the beginning of the given period
///   3. The relative weight of a stake at the end of the given period
///   4. The duration of the period
///
/// @notice Percentage-based calculation:
///   Most calculations in this contract are made in percentages (0% to 100%
///   ranges) to decouple the mathematical model from the actual values defined by
///   the team.
///
/// @notice Multiplier:
///   All equations were adjusted to consider a multiplier, in order to work
///   with high-enough numbers and avoid loss of precision due to lack of
///   floating-point numbers.
///   i.e.: instead of `0.1` we consider `0.1 * Multiplier`
///   The inverse operation (divide by the multipler) is thus needed at the end,
///   to retrieve the originally inteded result
///
/// @notice Adjusted weights:
///   Weights are adjusted through their square root, to decrease differences between high and low stakes
///   e.g.: if two stakes exist, Alice with 1 TAL, and Bob with 2 TAL, adjusted weights are:
///     Alice: sqrt(1) / (sqrt(1) + sqrt(2)) ~= 41.42%
///     Bob:   sqrt(2) / (sqrt(1) + sqrt(2)) ~= 58.57%
contract RewardCalculatorV3 is Initializable, ContextUpgradeable, AccessControlEnumerableUpgradeable {
    /// Multiplier used to offset small percentage values to fit within a uint256
    /// e.g. 5% is internally represented as (0.05 * mul). The final result
    /// after calculations is divided by mul again to retrieve a real value
    uint256 internal constant MUL = 1e10;

    function initialize() public virtual initializer {
        __Context_init_unchained();
        __AccessControlEnumerable_init_unchained();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mul() external pure returns (uint256) {
        return MUL;
    }

    /// Calculates how many shares should be rewarded to a stake,
    /// based on how many shares are staked, and a beginning timestamp
    ///
    /// This will take into account the current weight of the stake in
    /// comparison to `totalShares()`, and the duration of the stake
    ///
    /// @notice Rewards are split between staker and talent, according to the adjusted weights,
    /// given for each of them, which should correspond to their own Talent token balance
    ///
    /// @param _shares How many shares to be considered
    /// @param _stakerS S value at last checkpoint made by staker
    /// @param _currentS current S value
    /// @return stakerShare the staker's share of the reward
    function calculateReward(uint256 _shares, uint256 _stakerS, uint256 _currentS) public pure returns (uint256) {
        uint256 total = (sqrt(_shares) * (_currentS - _stakerS)) / MUL;

        return total;
    }

    function calculateGlobalReward(
        uint256 stakingStart,
        uint256 stakingEnd,
        uint256 _start,
        uint256 _end,
        uint256 rewardsMax
    ) public pure returns (uint256) {
        (uint256 start, uint256 end) = _truncatePeriod(stakingStart, stakingEnd, _start, _end);
        (uint256 startPercent, uint256 endPercent) = _periodToPercents(stakingStart, stakingEnd, start, end);

        uint256 percentage = _curvePercentage(startPercent, endPercent);

        return ((percentage * rewardsMax));
    }

    /// Truncates a period to fit within the start and end date of the staking period
    function _truncatePeriod(
        uint256 _stakingStart,
        uint256 _stakingEnd,
        uint256 _start,
        uint256 _end
    ) internal pure returns (uint256, uint256) {
        if (_end <= _stakingStart || _start >= _stakingEnd) {
            return (_stakingStart, _stakingStart);
        }

        uint256 periodStart = _start < _stakingStart ? _stakingStart : _start;
        uint256 periodEnd = _end > _stakingEnd ? _stakingEnd : _end;

        return (periodStart, periodEnd);
    }

    /// converts a period to percentages where 0 is the beginning and 100 is
    /// the end of the staking period
    function _periodToPercents(
        uint256 _stakingStart,
        uint256 _stakingEnd,
        uint256 _start,
        uint256 _end
    ) internal pure returns (uint256, uint256) {
        uint256 totalDuration = _stakingEnd - _stakingStart;

        if (totalDuration == 0) {
            return (0, 1);
        }

        uint256 startPercent = ((_start - _stakingStart) * MUL) / totalDuration;
        uint256 endPercent = ((_end - _stakingStart) * MUL) / totalDuration;

        return (startPercent, endPercent);
    }

    function _curvePercentage(uint256 _start, uint256 _end) internal pure returns (uint256) {
        int256 maxArea = _integralAt(MUL) - _integralAt(0);
        int256 actualArea = _integralAt(_end) - _integralAt(_start);

        uint256 ratio = uint256((actualArea * int256(MUL)) / maxArea);

        return ratio;
    }

    // Original equation: (1-x)^2 (ranging from 0 to 1 in both axis)
    // We actualy need to go from 0 to MUL, to keep outside of floating point territory:
    // Equation with multiplier: (MUL-x)^2/MUL
    //
    // We want the integral equation of that:
    //   Integrate[(MUL-x)^2/MUL]
    //   => Integrate[(MUL-x)^2] / MUL
    //   => (x^3/3 - MUL * x^2 + M^2 * x) / MUL
    //
    // This last part, `x^3/3 - MUL * x^2 + M^2 * x`, is what we want to calculate here
    // The final division by `MUL` is missing, but this is expected to be done
    // outside, once the final reward calculation is made, since it would
    // result in too much loss of precision at this stage.
    function _integralAt(uint256 _x) internal pure returns (int256) {
        int256 x = int256(_x);
        int256 m = int256(MUL);

        return (x ** 3) / 3 - m * x ** 2 + m ** 2 * x;
    }

    /// copied from https://github.com/ethereum/dapp-bin/pull/50/files
    function sqrt(uint256 x) public pure returns (uint256 y) {
        if (x == 0) return 0;
        else if (x <= 3) return 1;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
