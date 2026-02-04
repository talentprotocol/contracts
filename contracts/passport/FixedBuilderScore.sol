// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Fixed Builder Score
/// @notice A dummy PassportBuilderScore that returns a fixed score for all users
contract FixedBuilderScore is Ownable {
    uint256 public fixedScore;

    event FixedScoreUpdated(uint256 oldScore, uint256 newScore);

    constructor(uint256 _fixedScore, address _owner) Ownable(_owner) {
        fixedScore = _fixedScore;
    }

    /// @notice Set the fixed score returned for all passport IDs
    /// @param _fixedScore The new fixed score
    function setFixedScore(uint256 _fixedScore) external onlyOwner {
        uint256 oldScore = fixedScore;
        fixedScore = _fixedScore;
        emit FixedScoreUpdated(oldScore, _fixedScore);
    }

    /// @notice Returns the fixed score for any passport ID
    /// @param _passportId Ignored - returns the same score for all
    /// @return The fixed score
    function getScore(uint256 _passportId) external view returns (uint256) {
        return fixedScore;
    }
}
