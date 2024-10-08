// SPDX-License-Identifier: MIT
// Based on: https://github.com/gnosis/safe-token-distribution/blob/master/tooling/contracts/MerkleDistribution.sol
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../merkle/MerkleProof.sol";

contract TalentTGEUnlock is Ownable {
    using SafeERC20 for IERC20;

    event Claimed(address indexed claimer, uint256 amount, uint256 burned);

    address public immutable token;
    bytes32 public merkleRoot;
    bool public isContractEnabled;
    mapping(address => uint256) public claimed;

    constructor(
        address _token,
        bytes32 _merkleRoot,
        address owner
    ) Ownable(owner) {
        token = _token;
        merkleRoot = _merkleRoot;
        isContractEnabled = false;
    }

    function disableContract() external onlyOwner {
        isContractEnabled = false;
    }

    function enableContract() external onlyOwner {
        isContractEnabled = true;
    }

    function claim(
        bytes32[] calldata merkleProofClaim,
        uint256 amountAllocated
    ) external {
        require(isContractEnabled, "Contracts are disabled");
        require(claimed[msg.sender] == 0, "Already claimed");
        verifyAmount(merkleProofClaim, amountAllocated);

        address beneficiary = msg.sender;
        uint256 amountToClaim = calculate(beneficiary, amountAllocated);

        claimed[beneficiary] += amountToClaim;
        IERC20(token).safeTransfer(beneficiary, amountToClaim);

        emit Claimed(beneficiary, amountToClaim, 0);
    }

    function verifyAmount(
        bytes32[] calldata proof,
        uint256 amountAllocated
    ) internal view {
        bytes32 root = merkleRoot;
        bytes32 leaf = keccak256(
            bytes.concat(keccak256(abi.encode(msg.sender, amountAllocated)))
        );

        require(
            MerkleProof.verify(proof, root, leaf),
            "Invalid Allocation Proof"
        );
    }

    function calculate(
        address beneficiary,
        uint256 amountAllocated
    ) internal view returns (uint256 amountToClaim) {
        uint256 amountClaimed = claimed[beneficiary];
        assert(amountClaimed <= amountAllocated);
        amountToClaim = amountAllocated - amountClaimed;
    }

    function setMerkleRoot(bytes32 nextMerkleRoot) external onlyOwner {
        merkleRoot = nextMerkleRoot;
    }

    function withdraw() external onlyOwner {
        IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
    }
}
