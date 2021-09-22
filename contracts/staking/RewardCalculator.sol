// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

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
}

abstract contract RewardCalculator is IRewardParameters {
    /// Multiplier used to offset small percentage values to fit within a uint256
    /// e.g. 5% is internally represented as (0.05 * mul). The final result after calculations is divided by mul again to retrieve a real value
    uint256 private constant mul = 1e6;

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
        (uint256 start, uint256 end) = _truncatePeriod(_start, _end);
        (uint256 startPercent, uint256 endPercent) = _periodToPercents(start, end);

        // TODO
        return 1 ether;
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

        uint256 startPercent = ((_start - this.start()) * mul) / totalDuration;
        uint256 endPercent = ((_end - this.start()) * mul) / totalDuration;

        return (startPercent, endPercent);
    }

    function _curvePercentage(uint256 _start, uint256 _end) internal pure returns (uint256) {
        int256 maxArea = _integralAt(mul) - _integralAt(0);
        int256 actualArea = _integralAt(_end) - _integralAt(_start);

        uint256 ratio = uint256((actualArea * int256(mul)) / maxArea);

        return ratio;
    }

    function _integralAt(uint256 _x) internal pure returns (int256) {
        // TODO add final curve here
        // This just returns 50% all the way through
        int256 x = int256(_x);
        int256 p1 = ((x - int256(mul))**3) / (3 * int256(mul));

        return p1;
    }
}
