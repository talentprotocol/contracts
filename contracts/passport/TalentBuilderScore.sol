// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./PassportBuilderScore.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TalentBuilderScore is Ownable {
    using ECDSA for bytes32;

    address public trustedSigner;
    address public feeReceiver;
    PassportBuilderScore public passportBuilderScore;
    PassportRegistry public passportRegistry;
    uint256 public cost = 0.0001 ether;

    event BuilderScoreSet(address indexed user, uint256 score, uint256 talentId);

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
     * @notice Changes the owner of passport registry.
     * @param _newOwner The new owner of passport registry.
     * @dev Can only be called by the owner.
     */
    function setPassportRegistryOwner(address _newOwner) public onlyOwner {
        passportRegistry.transferOwnership(_newOwner);
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
     * @param talentId The number of the talent profile to receive the attestation.
     * @param wallet The wallet to receive the attestation.
     * @param signature The signature of the trusted signer.
     */
    function addScore(uint256 score, uint256 talentId, address wallet, bytes memory signature) public payable {
        require(enabled, "Setting the Builder Score is disabled for this contract");
        // Ensure the caller has paid the required fee
        require(msg.value >= cost, "Insufficient payment");
        // Hash the number
        bytes32 numberHash = keccak256(abi.encodePacked(score, talentId, wallet));

        // Recover the address that signed the hash
        address signer = MessageHashUtils.toEthSignedMessageHash(numberHash).recover(signature);

        // Ensure the signer is the trusted signer
        require(signer == trustedSigner, "Invalid signature");

        // Transfer fee to fee receiver
        payable(feeReceiver).transfer(msg.value);

        // Create passport if it does not exist
        if(passportRegistry.idPassport(talentId) == address(0)) {
            passportRegistry.adminCreate("talent_builder_score", wallet, talentId);
        }

        // Emit event
        require(passportBuilderScore.setScore(talentId, score), "Failed to set score");
        emit BuilderScoreSet(wallet, score, talentId);
    }
}
