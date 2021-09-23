// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "hardhat/console.sol";

interface IRewardParameters {
    /// Start of the staking period
    function start() external view returns (uint256);

    /// End of the staking period
    function end() external view returns (uint256);

    // Total amount of shares currently staked
    function totalShares() external view returns (uint256);

    /// Maximum amount of rewards to be distributed
    function rewardsMax() external view returns (uint256);

    // Total amount of rewards already given
    function rewardsGiven() external view returns (uint256);

    // Amount of rewards still left to earn
    function rewardsLeft() external view returns (uint256);

    /// Sum of sqrt(tokenAmount) for each stake
    /// Used to compute adjusted reward values
    function totalAdjustedShares() external view returns (uint256);
}

abstract contract RewardCalculator is IRewardParameters {
    /// Multiplier used to offset small percentage values to fit within a uint256
    /// e.g. 5% is internally represented as (0.05 * mul). The final result
    /// after calculations is divided by mul again to retrieve a real value
    uint256 internal constant MUL = 1e10;

    /// Calculates how many shares should be rewarded to a stake,
    /// based on how many shares are staked, and a beginning timestamp
    ///
    /// This will take into account the current weight of the stake in
    /// comparison to `totalShares()`, and the duration of the stake
    ///
    /// @param _shares How many shares to be considered
    /// @param _start Timestamp to start from
    /// @param _end Timestamp to end
    function calculateReward(
        uint256 _shares,
        uint256 _start,
        uint256 _end
    ) internal view returns (uint256) {
        if (this.totalAdjustedShares() == 0) {
            return 0;
        }

        (uint256 start, uint256 end) = _truncatePeriod(_start, _end);
        (uint256 startPercent, uint256 endPercent) = _periodToPercents(start, end);

        uint256 percentage = _curvePercentage(startPercent, endPercent);
        uint256 weight = (sqrt(_shares) * MUL) / this.totalAdjustedShares();

        return ((this.rewardsLeft() * percentage * weight)) / (MUL * MUL);
    }

    /// Truncates a period to fit within the start and end date of the staking period
    function _truncatePeriod(uint256 _start, uint256 _end) internal view returns (uint256, uint256) {
        if (_end <= this.start() || _start >= this.end()) {
            return (this.start(), this.start());
        }

        uint256 periodStart = _start < this.start() ? this.start() : _start;
        uint256 periodEnd = _end > this.end() ? this.end() : _end;

        return (periodStart, periodEnd);
    }

    /// converts a period to percentages where 0 is the beginning and 100 is
    /// the end of the staking period
    function _periodToPercents(uint256 _start, uint256 _end) internal view returns (uint256, uint256) {
        uint256 totalDuration = this.end() - this.start();

        if (totalDuration == 0) {
            return (0, 1);
        }

        uint256 startPercent = ((_start - this.start()) * MUL) / totalDuration;
        uint256 endPercent = ((_end - this.start()) * MUL) / totalDuration;

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

        return (x**3) / 3 - m * x**2 + m**2 * x;
    }

    /// copied from https://github.com/ethereum/dapp-bin/pull/50/files
    function sqrt(uint256 x) internal pure returns (uint256 y) {
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
