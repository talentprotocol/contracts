// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TalentPlusSubscription.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TalentPlus is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    // TALENT token address
    IERC20 public immutable TALENT_TOKEN;

    address public trustedSigner;
    address public feeReceiver;
    TalentPlusSubscription public talentPlusSubscription;

    event SubscriptionCreated(address indexed user, uint256 score, string subscriptionSlug);

    bool public enabled;

    constructor(
        address _trustedSigner,
        address _talentPlusSubscriptionAddress,
        address _feeReceiver,
        address _talentTokenAddress
    ) Ownable(msg.sender) {
        trustedSigner = _trustedSigner;
        talentPlusSubscription = TalentPlusSubscription(_talentPlusSubscriptionAddress);
        feeReceiver = _feeReceiver;
        TALENT_TOKEN = IERC20(_talentTokenAddress);
        enabled = true;
    }

    /**
     * @notice Enables or disables the TalentPlus contract.
     * @param _enabled Whether the TalentPlus contract should be enabled.
     * @dev Can only be called by the owner.
     */
    function setEnabled(bool _enabled) public onlyOwner {
        enabled = _enabled;
    }

    /**
     * @notice Disables the TalentPlus contract.
     * @dev Can only be called by the owner.
     */
    function setDisabled() public onlyOwner {
        enabled = false;
    }

    /**
     * @notice Updates the TalentPlusSubscription contract address.
     * @param _talentPlusSubscriptionAddress The new TalentPlusSubscription contract address.
     * @dev Can only be called by the owner.
     */
    function updateTalentPlusSubscription(address _talentPlusSubscriptionAddress) public onlyOwner {
        require(_talentPlusSubscriptionAddress != address(0), "Invalid TalentPlusSubscription address");
        talentPlusSubscription = TalentPlusSubscription(_talentPlusSubscriptionAddress);
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
     * @notice Creates a subscription if the provided number is signed by the trusted signer.
     * @param score The number to be attested.
     * @param subscriptionSlug The subscription slug to set in TalentPlusSubscription.
     * @param signature The signature of the trusted signer.
     */
    function subscribe(uint256 score, string memory subscriptionSlug, bytes memory signature) public nonReentrant {
        require(enabled, "Subscription is disabled for this contract");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        
        // Get the subscription model details including price
        (, uint256 subscriptionCost, bool isActive) = talentPlusSubscription.getSubscriptionModel(subscriptionSlug);
        require(isActive, "Subscription model is not active");
        
        // Hash the number with the user's wallet address
        bytes32 numberHash = keccak256(abi.encodePacked(score, msg.sender));

        // Recover the address that signed the hash
        address signer = MessageHashUtils.toEthSignedMessageHash(numberHash).recover(signature);

        // Ensure the signer is the trusted signer
        require(signer == trustedSigner, "Invalid signature");

        // Transfer TALENT tokens from user to fee receiver
        TALENT_TOKEN.safeTransferFrom(msg.sender, feeReceiver, subscriptionCost);

        // Set the user subscription in TalentPlusSubscription using wallet address
        talentPlusSubscription.addUserSubscription(msg.sender, subscriptionSlug);
        
        emit SubscriptionCreated(msg.sender, score, subscriptionSlug);
    }
}
