// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
 * Merkle Proof library as seen on:
 * https://github.com/gnosis/safe-token-distribution/blob/master/tooling/contracts/MerkleProof.sol
 */
library MerkleProof {
    function verify(bytes32[] calldata proof, bytes32 root, bytes32 leaf) internal pure returns (bool) {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computed = hashPair(computed, proof[i]);
        }
        return computed == root;
    }

    function hashPair(bytes32 a, bytes32 b) private pure returns (bytes32 value) {
        (a, b) = (a < b) ? (a, b) : (b, a);

        /// @solidity memory-safe-assembly
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
}
