// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TalentPlusSubscription.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TalentPlus is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // TALENT token address
    IERC20 public immutable TALENT_TOKEN;

    address public trustedSigner;
    address public feeReceiver;
    TalentPlusSubscription public talentPlusSubscription;

    event SubscriptionCreated(address indexed payer, address indexed recipient, string subscriptionSlug);

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
     * @notice Creates a subscription for a specified wallet.
     * @param wallet The wallet address to create the subscription for.
     * @param subscriptionSlug The subscription slug to set in TalentPlusSubscription.
     * @dev Only the trusted signer can call this function. TalentPlus contract is a trusted signer in TalentPlusSubscription.
     */
    function subscribe(address wallet, string memory subscriptionSlug) public nonReentrant {
        require(enabled, "Subscription is disabled for this contract");
        require(wallet != address(0), "Invalid wallet address");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        require(msg.sender == trustedSigner, "Only trusted signer can create subscriptions");
        
        // Get the subscription model details including price
        (, uint256 subscriptionCost, bool isActive) = talentPlusSubscription.getSubscriptionModel(subscriptionSlug);
        require(isActive, "Subscription model is not active");

        // Transfer TALENT tokens from trusted signer to fee receiver
        TALENT_TOKEN.safeTransferFrom(msg.sender, feeReceiver, subscriptionCost);

        // Set the subscription for the target wallet in TalentPlusSubscription
        talentPlusSubscription.addUserSubscription(wallet, subscriptionSlug);
        
        emit SubscriptionCreated(msg.sender, wallet, subscriptionSlug);
    }
}
