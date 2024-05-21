// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PassportRegistry.sol";

contract PassportBuilderScore is Ownable {
    PassportRegistry public passportRegistry;

    // Mapping to store scores for each passport ID
    mapping(uint256 => uint256) private passportScores;

    event ScoreUpdated(uint256 indexed passportId, uint256 score);

    constructor(address passportRegistryAddress, address initialOwner) Ownable(initialOwner) {
        passportRegistry = PassportRegistry(passportRegistryAddress);
    }

    /**
     * @notice Sets the score for a given passport ID.
     * @dev Can only be called by the owner.
     * @param passportId The ID of the passport to set the score for.
     * @param score The score to set for the passport ID.
     */
    function setScore(uint256 passportId, uint256 score) external onlyOwner {
        require(passportRegistry.idPassport(passportId) != address(0), "Passport ID does not exist");
        passportScores[passportId] = score;
        emit ScoreUpdated(passportId, score);
    }

    /**
     * @notice Gets the score of a given passport ID.
     * @param passportId The ID of the passport to get the score for.
     * @return The score of the given passport ID.
     */
    function getScore(uint256 passportId) external view returns (uint256) {
        return passportScores[passportId];
    }
}
