// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TalentPlusSubscription.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TalentPlus is Ownable, ReentrancyGuard {

    address public feeReceiver;
    TalentPlusSubscription public talentPlusSubscription;

    event SubscriptionCreated(address indexed payer, address indexed recipient, string subscriptionSlug, uint256 finalPrice, bool discountApplied);

    bool public enabled;

    constructor(
        address _talentPlusSubscriptionAddress,
        address _feeReceiver
    ) Ownable(msg.sender) {
        talentPlusSubscription = TalentPlusSubscription(_talentPlusSubscriptionAddress);
        feeReceiver = _feeReceiver;
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
     * @notice Creates a subscription for a specified wallet.
     * @param wallet The wallet address to create the subscription for.
     * @param subscriptionSlug The subscription slug to set in TalentPlusSubscription.
     * @dev Can be called by anyone. TalentPlus contract is a trusted signer in TalentPlusSubscription.
     * @dev Requires ETH payment equal to the subscription cost.
     */
    function subscribe(address wallet, string memory subscriptionSlug) public payable nonReentrant {
        require(enabled, "Subscription is disabled for this contract");
        require(wallet != address(0), "Invalid wallet address");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        
        // Get the subscription model details and calculate discounted price
        (, , , , bool isActive) = talentPlusSubscription.getSubscriptionModel(subscriptionSlug);
        require(isActive, "Subscription model is not active");
        
        // Calculate discounted price based on TALENT holdings
        (uint256 finalPrice, bool discountApplied,) = talentPlusSubscription.calculateDiscountedPrice(subscriptionSlug, wallet);
        require(msg.value >= finalPrice, "Insufficient ETH payment");

        // Transfer ETH to fee receiver
        (bool success, ) = feeReceiver.call{value: finalPrice}("");
        require(success, "ETH transfer failed");

        // Refund excess ETH if any
        if (msg.value > finalPrice) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - finalPrice}("");
            require(refundSuccess, "ETH refund failed");
        }

        // Set the subscription for the target wallet in TalentPlusSubscription
        talentPlusSubscription.addUserSubscription(wallet, subscriptionSlug, msg.sender, finalPrice);
        
        emit SubscriptionCreated(msg.sender, wallet, subscriptionSlug, finalPrice, discountApplied);
    }
}
