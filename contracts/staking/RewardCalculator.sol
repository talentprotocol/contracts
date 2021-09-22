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
    ) internal pure returns (uint256) {
        // TODO
        return 1 ether;
    }
}
