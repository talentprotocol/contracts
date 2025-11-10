// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TalentPlusSubscription.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TalentPlus is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public feeReceiver;
    TalentPlusSubscription public talentPlusSubscription;
    address public paymentToken;

    event SubscriptionCreated(address indexed payer, address indexed recipient, string subscriptionSlug, uint256 pricePaid, bool discountApplied);

    bool public enabled;

    constructor(
        address _talentPlusSubscriptionAddress,
        address _feeReceiver,
        address _paymentToken
    ) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid payment token address");
        talentPlusSubscription = TalentPlusSubscription(_talentPlusSubscriptionAddress);
        feeReceiver = _feeReceiver;
        paymentToken = _paymentToken;
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
     * @notice Creates a subscription for a specified wallet using the payment token.
     * @param wallet The wallet address to create the subscription for.
     * @param subscriptionSlug The subscription slug to set in TalentPlusSubscription.
     * @param tokenAmount The amount of tokens to pay (must be >= required amount).
     * @dev Can be called by anyone. TalentPlus contract is a trusted signer in TalentPlusSubscription.
     * @dev Requires token payment. User must have approved this contract to spend tokens.
     * @dev Uses SafeERC20 for secure token transfers.
     */
    function subscribe(
        address wallet,
        string memory subscriptionSlug,
        uint256 tokenAmount
    ) public nonReentrant {
        require(enabled, "Subscription is disabled for this contract");
        require(wallet != address(0), "Invalid wallet address");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        
        // Get the subscription model details and calculate discounted price
        (, , , , bool isActive) = talentPlusSubscription.getSubscriptionModel(subscriptionSlug);
        require(isActive, "Subscription model is not active");
        
        // Calculate discounted price based on TALENT holdings
        (uint256 finalPrice, bool discountApplied,) = talentPlusSubscription.calculateDiscountedPrice(subscriptionSlug, wallet);
        require(tokenAmount >= finalPrice, "Insufficient token payment");
        
        // Transfer tokens from user to fee receiver using SafeERC20
        IERC20(paymentToken).safeTransferFrom(msg.sender, feeReceiver, finalPrice);
        
        // Refund excess tokens if any
        if (tokenAmount > finalPrice) {
            uint256 excessAmount = tokenAmount - finalPrice;
            IERC20(paymentToken).safeTransfer(msg.sender, excessAmount);
        }
        
        // Set the subscription for the target wallet in TalentPlusSubscription
        talentPlusSubscription.addUserSubscription(wallet, subscriptionSlug, msg.sender, finalPrice);
        
        emit SubscriptionCreated(msg.sender, wallet, subscriptionSlug, finalPrice, discountApplied);
    }
}
