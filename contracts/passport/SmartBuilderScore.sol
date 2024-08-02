// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract SmartBuilderScore {
    using ECDSA for bytes32;

    address public trustedSigner;

    event AttestationCreated(address indexed user, uint256 score, uint256 passportId);

    constructor(address _trustedSigner) {
        trustedSigner = _trustedSigner;
    }

    /**
     * @notice Creates an attestation if the provided number is signed by the trusted signer.
     * @param score The number to be attested.
     * @param passportId The number of the passport to receive the attestation.
     * @param signature The signature of the trusted signer.
     */
    function createAttestation(uint256 score, uint256 passportId, bytes memory signature) public {
        // Hash the number
        bytes32 numberHash = keccak256(abi.encodePacked(score, passportId));

        // Recover the address that signed the hash
        address signer = MessageHashUtils.toEthSignedMessageHash(numberHash).recover(signature);

        // Ensure the signer is the trusted signer
        require(signer == trustedSigner, "Invalid signature");

        // Emit event
        emit AttestationCreated(msg.sender, score, passportId);
    }
}
