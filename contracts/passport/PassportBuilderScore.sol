// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PassportRegistry.sol";

contract PassportBuilderScore is Ownable {
    PassportRegistry public passportRegistry;

    // Mapping to store scores for each passport ID
    mapping(uint256 => uint256) private passportScores;

    // Mapping to store timestamps of last updates for each passport ID
    mapping(uint256 => uint256) private passportLastUpdate;

    // Mapping to store trusted signers
    mapping(address => bool) public trustedSigners;

    event ScoreUpdated(uint256 indexed passportId, uint256 score, uint256 timestamp);
    event PassportRegistryChanged(address indexed oldAddress, address indexed newAddress);

    uint256 public EXPIRATION_TIME = 1 days * 90; // 90 days

    constructor(address passportRegistryAddress, address initialOwner) Ownable(initialOwner) {
        passportRegistry = PassportRegistry(passportRegistryAddress);
        trustedSigners[initialOwner] = true;
    }

    /**
     * @notice Sets the expiration time for the scores.
     * @dev Can only be called by the owner.
     * @param newExpirationTime The new expiration time in days.
     */
    function setExpirationTime(uint256 newExpirationTime) external onlyOwner {
        EXPIRATION_TIME = 1 days * newExpirationTime;
    }

    /**
     * @notice Adds the given address to the list of trusted signers.
     * @dev Can only be called by the owner.
     * @param signer The address to add to the list of trusted signers.
     */
    function addTrustedSigner(address signer) external onlyOwner {
        trustedSigners[signer] = true;
    }

    /**
     * @notice Removes the given address from the list of trusted signers.
     * @dev Can only be called by the owner.
     * @param signer The address to remove from the list of trusted signers.
     */
    function removeTrustedSigner(address signer) external onlyOwner {
        trustedSigners[signer] = false;
    }

    /**
     * @notice Sets the score for a given passport ID.
     * @dev Can only be called by the owner.
     * @param passportId The ID of the passport to set the score for.
     * @param score The score to set for the passport ID.
     */
    function setScore(uint256 passportId, uint256 score) external returns (bool) {
        require(trustedSigners[msg.sender], "Caller is not a trusted signer");
        require(passportRegistry.idPassport(passportId) != address(0), "Passport ID does not exist");
        passportScores[passportId] = score;
        passportLastUpdate[passportId] = block.timestamp;
        emit ScoreUpdated(passportId, score, block.timestamp);
        return true;
    }

    /**
     * @notice Gets the score of a given passport ID.
     * @param passportId The ID of the passport to get the score for.
     * @return The score of the given passport ID.
     */
    function getScore(uint256 passportId) public view returns (uint256) {
        uint256 lastUpdate = passportLastUpdate[passportId] == 0 ? block.timestamp : passportLastUpdate[passportId];
        require(lastUpdate + EXPIRATION_TIME >= block.timestamp, "Score is expired");
        return passportScores[passportId];
    }

    /**
     * @notice Gets the timestamp of the last update for a given passport ID.
     * @param passportId The ID of the passport to get the last update timestamp for.
     * @return The timestamp of the last update for the given passport ID.
     */
    function getLastUpdate(uint256 passportId) external view returns (uint256) {
        return passportLastUpdate[passportId];
    }

    function getLastUpdateByAddress(address wallet) external view returns (uint256) {
        return passportLastUpdate[passportRegistry.passportId(wallet)];
    }

    /**
     * @notice Gets the score of a given address.
     * @param wallet The address to get the score for.
     * @return The score of the given address.
     */
    function getScoreByAddress(address wallet) external view returns (uint256) {
        uint256 passportId = passportRegistry.passportId(wallet);
        require(passportRegistry.idPassport(passportId) != address(0), "Passport ID does not exist");

        uint256 score = getScore(passportId);
        return score;
    }

    /**
     * @notice Changes the address of the PassportRegistry contract.
     * @dev Can only be called by the owner.
     * @param newPassportRegistryAddress The address of the new PassportRegistry contract.
     */
    function setPassportRegistry(address newPassportRegistryAddress) external onlyOwner {
        require(newPassportRegistryAddress != address(0), "Invalid address");
        address oldAddress = address(passportRegistry);
        passportRegistry = PassportRegistry(newPassportRegistryAddress);
        emit PassportRegistryChanged(oldAddress, newPassportRegistryAddress);
    }
}
