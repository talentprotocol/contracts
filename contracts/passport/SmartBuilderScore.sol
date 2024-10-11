// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./PassportBuilderScore.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SmartBuilderScore is Ownable {
    using ECDSA for bytes32;

    address public trustedSigner;
    address public feeReceiver;
    PassportBuilderScore public passportBuilderScore;
    PassportRegistry public passportRegistry;
    uint256 public cost = 0.0001 ether;

    event BuilderScoreSet(address indexed user, uint256 score, uint256 passportId);

    bool public enabled;

    constructor(
        address _trustedSigner,
        address _passportBuilderScoreAddress,
        address _passportRegistryAddress,
        address _feeReceiver
    ) Ownable(_trustedSigner) {
        trustedSigner = _trustedSigner;
        passportBuilderScore = PassportBuilderScore(_passportBuilderScoreAddress);
        passportRegistry = PassportRegistry(_passportRegistryAddress);
        feeReceiver = _feeReceiver;
        enabled = true;
    }

    /**
     * @notice Enables or disables the SmartBuilderScore contract.
     * @param _enabled Whether the SmartBuilderScore contract should be enabled.
     * @dev Can only be called by the owner.
     */
    function setEnabled(bool _enabled) public onlyOwner {
        enabled = _enabled;
    }

    /**
     * @notice Disables the SmartBuilderScore contract.
     * @dev Can only be called by the owner.
     */
    function setDisabled() public onlyOwner {
        enabled = false;
    }

    /**
     * @notice Sets the cost of adding a score.
     * @param _cost The cost of adding a score.
     * @dev Can only be called by the owner.
     */
    function setCost(uint256 _cost) public onlyOwner {
        cost = _cost;
    }

    /**
     * @notice Updates the fee receiver address.
     * @param _feeReceiver The new fee receiver address.
     * @dev Can only be called by the owner.
     */
    function updateReceiver(address _feeReceiver) public onlyOwner {
        feeReceiver = _feeReceiver;
    }

    /**
     * @notice Creates an attestation if the provided number is signed by the trusted signer.
     * @param score The number to be attested.
     * @param passportId The number of the passport to receive the attestation.
     * @param signature The signature of the trusted signer.
     */
    function addScore(uint256 score, uint256 passportId, bytes memory signature) public payable {
        require(enabled, "Setting the Builder Score is disabled for this contract");
        // Ensure the caller has paid the required fee
        require(msg.value >= cost, "Insufficient payment");
        // Hash the number
        bytes32 numberHash = keccak256(abi.encodePacked(score, passportId));

        // Recover the address that signed the hash
        address signer = MessageHashUtils.toEthSignedMessageHash(numberHash).recover(signature);

        // Ensure the signer is the trusted signer
        require(signer == trustedSigner, "Invalid signature");

        // Transfer fee to fee receiver
        payable(feeReceiver).transfer(msg.value);

        // Emit event
        require(passportBuilderScore.setScore(passportId, score), "Failed to set score");
        emit BuilderScoreSet(msg.sender, score, passportId);
    }
}
