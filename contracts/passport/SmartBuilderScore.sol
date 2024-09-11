// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./PassportBuilderScore.sol";
import "./PassportSources.sol";
import "./PassportAttester.sol";
import { AttestationRequest, AttestationRequestData } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { NO_EXPIRATION_TIME, EMPTY_UID } from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";

contract SmartBuilderScore {
    using ECDSA for bytes32;

    address public trustedSigner;
    address public feeReceiver;
    PassportBuilderScore public passportBuilderScore;
    PassportSources public passportSources;
    PassportRegistry public passportRegistry;
    PassportAttester public passportAttester;

    uint256 public COST = 0.001 ether;
    bytes32 private constant SCHEMA =
        keccak256(
            "AttestationRequestData(string id,string[] type,string name,string description,string credentialSubjectId,string credentialSubjectName,string[] credentialSubjectTypes,string[] credentialSubjectTypesIds,string[] credentialSubjectTypesNames,string[] credentialSubjectTypesCategories,string[] credentialSubjectTypesValidFroms,string[] credentialSubjectTypesValidUntils,uint16[] credentialSubjectTypesScores,string[] credentialSubjectTypesData,string validFrom,string validUntil,string[] statusesTypes,string[] statusesCredentialSubjectIds,bool[] statusesCredentialSubjectRevoked,string credentialSchemaId,string credentialSchemaType,string termsOfUseId,string termsOfUseType)"
        );

    event BuilderScoreSet(address indexed user, uint256 score, uint256 passportId);

    constructor(
        address _trustedSigner,
        address _passportBuilderScoreAddress,
        address _passportSourcesAddress,
        address _passportRegistryAddress,
        address _feeReceiver,
        address _passportAttesterAddress
    ) {
        trustedSigner = _trustedSigner;
        passportBuilderScore = PassportBuilderScore(_passportBuilderScoreAddress);
        passportSources = PassportSources(_passportSourcesAddress);
        passportRegistry = PassportRegistry(_passportRegistryAddress);
        passportAttester = PassportAttester(_passportAttesterAddress);
        feeReceiver = _feeReceiver;
    }

    /**
     * @notice Creates an attestation if the provided number is signed by the trusted signer.
     * @param score The number to be attested.
     * @param passportId The number of the passport to receive the attestation.
     * @param signature The signature of the trusted signer.
     * @param attestationData The data to be included in the attestation.
     */
    function addScore(uint256 score, uint256 passportId, bytes memory signature, bytes memory attestationData) public payable {
        // Ensure the caller has paid the required fee
        require(msg.value >= COST, "Insufficient payment");
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

        address recipient = passportRegistry.idPassport(passportId);

        passportAttester.attest(
            AttestationRequest({
                    schema: SCHEMA,
                    data: AttestationRequestData({
                        recipient: recipient,
                        expirationTime: NO_EXPIRATION_TIME,
                        revocable: true,
                        refUID: EMPTY_UID,
                        data: attestationData,
                        value: 0 
                    })
            })
        );
    }
}
