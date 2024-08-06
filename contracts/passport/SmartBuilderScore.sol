// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./PassportBuilderScore.sol";
import "./PassportSources.sol";

contract SmartBuilderScore {
    using ECDSA for bytes32;

    address public trustedSigner;
    address public feeReceiver;
    PassportBuilderScore public passportBuilderScore;
    PassportSources public passportSources;
    PassportRegistry public passportRegistry;
    uint256 public cost = 0.001 ether;

    event BuilderScoreSet(address indexed user, uint256 score, uint256 passportId);

    constructor(
        address _trustedSigner,
        address _passportBuilderScoreAddress,
        address _passportSourcesAddress,
        address _passportRegistryAddress,
        address _feeReceiver
    ) {
        trustedSigner = _trustedSigner;
        passportBuilderScore = PassportBuilderScore(_passportBuilderScoreAddress);
        passportSources = PassportSources(_passportSourcesAddress);
        passportRegistry = PassportRegistry(_passportRegistryAddress);
        feeReceiver = _feeReceiver;
    }

    /**
     * @notice Creates an attestation if the provided number is signed by the trusted signer.
     * @param score The number to be attested.
     * @param passportId The number of the passport to receive the attestation.
     * @param signature The signature of the trusted signer.
     */
    function addScore(uint256 score, uint256 passportId, bytes memory signature) public payable {
        // Ensure the caller has paid the required fee
        require(msg.value >= cost, "Insufficient payment");
        // Hash the number
        bytes32 numberHash = keccak256(abi.encodePacked(score, passportId));

        // Recover the address that signed the hash
        address signer = MessageHashUtils.toEthSignedMessageHash(numberHash).recover(signature);

        // Ensure the signer is the trusted signer
        require(signer == trustedSigner, "Invalid signature");

        // check if the passport is associated with a mapped source
        string memory source = passportRegistry.idSource(passportId);
        address sourceAddress = passportSources.sources(source);
        if (sourceAddress != address(0)) {
            // Transfer fee to fee receiver
            payable(feeReceiver).transfer(msg.value / 2);
            // Transfer fee to source
            payable(sourceAddress).transfer(msg.value / 2);
        } else {
            // Transfer fee to fee receiver
            payable(feeReceiver).transfer(msg.value);
        }

        // Emit event
        require(passportBuilderScore.setScore(passportId, score), "Failed to set score");
        emit BuilderScoreSet(msg.sender, score, passportId);
    }
}
