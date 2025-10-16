// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TalentPlusSubscription is Ownable, ReentrancyGuard {

    // Mapping to store trusted signers
    mapping(address => bool) public trustedSigners;

    // Subscription model structure
    struct SubscriptionModel {
        string subscriptionSlug;
        uint256 durationInSeconds;
        uint256 priceInTalent;
        bool active;
    }

    // User active subscription structure
    struct UserActiveSubscription {
        string subscriptionSlug;
        uint256 expirationTime;
        uint256 startTime;
    }

    // Mapping from subscriptionSlug to subscription model
    mapping(string => SubscriptionModel) public subscriptionModels;
    
    // Array to store all available subscription slugs
    string[] public availableSubscriptionSlugs;

    // User active subscription: wallet => UserActiveSubscription
    mapping(address => UserActiveSubscription) public userActiveSubscription;

    // Events
    event SubscriptionModelAdded(string indexed subscriptionSlug, uint256 durationInSeconds, uint256 priceInTalent);
    event SubscriptionModelUpdated(string indexed subscriptionSlug, uint256 durationInSeconds, uint256 priceInTalent);
    event SubscriptionModelDeactivated(string indexed subscriptionSlug);
    event UserSubscriptionAdded(address indexed wallet, string indexed subscriptionSlug, uint256 expirationTime, uint256 startTime);
    event UserSubscriptionReplaced(address indexed wallet, string indexed oldSlug, string indexed newSlug, uint256 expirationTime, uint256 startTime);
    event UserSubscriptionExtended(address indexed wallet, string indexed subscriptionSlug, uint256 expirationTime, uint256 startTime);
    event TrustedSignerAdded(address indexed signer);
    event TrustedSignerRemoved(address indexed signer);

    constructor(address initialOwner) Ownable(initialOwner) {
        trustedSigners[initialOwner] = true;
    }

    /**
     * @notice Adds the given address to the list of trusted signers.
     * @param signer The address to add to the trusted signers list.
     * @dev Can only be called by the owner.
     */
    function addTrustedSigner(address signer) external onlyOwner {
        require(signer != address(0), "Invalid address");
        require(!trustedSigners[signer], "Signer is already trusted");
        
        trustedSigners[signer] = true;
        emit TrustedSignerAdded(signer);
    }

    /**
     * @notice Removes the given address from the list of trusted signers.
     * @param signer The address to remove from the trusted signers list.
     * @dev Can only be called by the owner.
     */
    function removeTrustedSigner(address signer) external onlyOwner {
        require(trustedSigners[signer], "Signer is not trusted");
        
        trustedSigners[signer] = false;
        emit TrustedSignerRemoved(signer);
    }

    /**
     * @notice Checks if an address is a trusted signer.
     * @param signer The address to check.
     * @return True if the address is a trusted signer.
     */
    function isTrustedSigner(address signer) external view returns (bool) {
        return trustedSigners[signer];
    }

    /**
     * @notice Adds a new subscription model
     * @param subscriptionSlug The subscription slug string for the subscription model
     * @param durationInSeconds The duration of the subscription in seconds
     * @param priceInTalent The price in TALENT tokens
     * @dev Can only be called by the owner or trusted signers
     */
    function addSubscriptionModel(
        string memory subscriptionSlug,
        uint256 durationInSeconds,
        uint256 priceInTalent
    ) external {
        require(owner() == msg.sender || trustedSigners[msg.sender], "Only owner or trusted signers can add subscription models");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        require(durationInSeconds > 0, "Duration must be greater than 0");
        require(priceInTalent > 0, "Price must be greater than 0");
        require(!subscriptionModels[subscriptionSlug].active, "Subscription model already exists");

        subscriptionModels[subscriptionSlug] = SubscriptionModel({
            subscriptionSlug: subscriptionSlug,
            durationInSeconds: durationInSeconds,
            priceInTalent: priceInTalent,
            active: true
        });

        availableSubscriptionSlugs.push(subscriptionSlug);

        emit SubscriptionModelAdded(subscriptionSlug, durationInSeconds, priceInTalent);
    }

    /**
     * @notice Updates an existing subscription model
     * @param subscriptionSlug The subscription slug of the subscription model to update
     * @param durationInSeconds The new duration in seconds
     * @param priceInTalent The new price in TALENT tokens
     * @dev Can only be called by the owner or trusted signers
     */
    function updateSubscriptionModel(
        string memory subscriptionSlug,
        uint256 durationInSeconds,
        uint256 priceInTalent
    ) external {
        require(owner() == msg.sender || trustedSigners[msg.sender], "Only owner or trusted signers can update subscription models");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        require(subscriptionModels[subscriptionSlug].active, "Subscription model does not exist");
        require(durationInSeconds > 0, "Duration must be greater than 0");
        require(priceInTalent > 0, "Price must be greater than 0");

        subscriptionModels[subscriptionSlug].durationInSeconds = durationInSeconds;
        subscriptionModels[subscriptionSlug].priceInTalent = priceInTalent;

        emit SubscriptionModelUpdated(subscriptionSlug, durationInSeconds, priceInTalent);
    }

    /**
     * @notice Deactivates a subscription model
     * @param subscriptionSlug The subscription slug of the subscription model to deactivate
     * @dev Can only be called by the owner or trusted signers
     */
    function deactivateSubscriptionModel(string memory subscriptionSlug) external {
        require(owner() == msg.sender || trustedSigners[msg.sender], "Only owner or trusted signers can deactivate subscription models");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        require(subscriptionModels[subscriptionSlug].active, "Subscription model does not exist or already inactive");

        subscriptionModels[subscriptionSlug].active = false;

        emit SubscriptionModelDeactivated(subscriptionSlug);
    }

    /**
     * @notice Adds or upgrades a user subscription for a specific model
     * @param wallet The wallet address of the user
     * @param subscriptionSlug The subscription slug of the subscription model to add/upgrade
     * @dev Can only be called by trusted signers
     * @dev Replaces any existing active subscription of different type
     * @dev Extends existing subscription if same type
     * @dev Prevents downgrades when current subscription is active
     */
    function addUserSubscription(address wallet, string memory subscriptionSlug) external nonReentrant {
        require(trustedSigners[msg.sender], "Only trusted signers can add user subscriptions");
        require(wallet != address(0), "Invalid wallet address");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        require(subscriptionModels[subscriptionSlug].active, "Subscription model is not active");

        SubscriptionModel memory newModel = subscriptionModels[subscriptionSlug];

        // Get current active subscription
        UserActiveSubscription memory currentActive = userActiveSubscription[wallet];
        
        // If user has an active subscription, check if this is an upgrade or extension
        if (bytes(currentActive.subscriptionSlug).length > 0) {
            // Check if current subscription is still active
            if (currentActive.expirationTime > block.timestamp) {
                // If subscribing to the same model, extend the subscription
                if (keccak256(bytes(currentActive.subscriptionSlug)) == keccak256(bytes(subscriptionSlug))) {
                    uint256 newExpirationTime = currentActive.expirationTime + newModel.durationInSeconds;
                    
                    userActiveSubscription[wallet] = UserActiveSubscription({
                        subscriptionSlug: subscriptionSlug,
                        expirationTime: newExpirationTime,
                        startTime: currentActive.startTime // Keep original start time for extensions
                    });
                    emit UserSubscriptionExtended(wallet, subscriptionSlug, newExpirationTime, currentActive.startTime);
                    return;
                } else {
                    // Different subscription model - check if it's an upgrade
                    SubscriptionModel memory currentModel = subscriptionModels[currentActive.subscriptionSlug];
                    require(newModel.durationInSeconds > currentModel.durationInSeconds, "Cannot downgrade an active subscription");
                }
            }
        }

        // Calculate expiration time for new/replacement subscription
        uint256 currentTime = block.timestamp;
        uint256 expirationTime = currentTime + newModel.durationInSeconds;

        // If user has an active subscription, emit replacement event
        if (bytes(currentActive.subscriptionSlug).length > 0) {
            emit UserSubscriptionReplaced(wallet, currentActive.subscriptionSlug, subscriptionSlug, expirationTime, currentTime);
        } else {
            emit UserSubscriptionAdded(wallet, subscriptionSlug, expirationTime, currentTime);
        }

        // Update user subscription
        userActiveSubscription[wallet] = UserActiveSubscription({
            subscriptionSlug: subscriptionSlug,
            expirationTime: expirationTime,
            startTime: currentTime
        });
    }

    /**
     * @notice Checks if a user has an active subscription
     * @param wallet The wallet address of the user to check
     * @return True if the user has an active subscription
     */
    function hasActiveSubscription(address wallet) external view returns (bool) {
        if (wallet == address(0)) {
            return false;
        }
        
        UserActiveSubscription memory active = userActiveSubscription[wallet];
        return bytes(active.subscriptionSlug).length > 0 && active.expirationTime > block.timestamp;
    }

    /**
     * @notice Checks if a user has an active subscription for a specific model
     * @param wallet The wallet address of the user to check
     * @param subscriptionSlug The subscription model subscription slug
     * @return True if the user has an active subscription for this specific model
     */
    function hasActiveSubscriptionForModel(address wallet, string memory subscriptionSlug) external view returns (bool) {
        if (wallet == address(0) || bytes(subscriptionSlug).length == 0) {
            return false;
        }
        
        UserActiveSubscription memory active = userActiveSubscription[wallet];
        return keccak256(bytes(active.subscriptionSlug)) == keccak256(bytes(subscriptionSlug)) && 
               active.expirationTime > block.timestamp;
    }

    /**
     * @notice Gets the expiration time for a user's active subscription
     * @param wallet The wallet address of the user
     * @return The expiration timestamp (0 if no active subscription)
     */
    function getSubscriptionExpiration(address wallet) external view returns (uint256) {
        UserActiveSubscription memory active = userActiveSubscription[wallet];
        return active.expirationTime;
    }

    /**
     * @notice Gets subscription model details
     * @param subscriptionSlug The subscription model subscription slug
     * @return durationInSeconds The duration in seconds
     * @return priceInTalent The price in TALENT tokens
     * @return active Whether the model is active
     */
    function getSubscriptionModel(string memory subscriptionSlug) external view returns (
        uint256 durationInSeconds,
        uint256 priceInTalent,
        bool active
    ) {
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        
        SubscriptionModel memory model = subscriptionModels[subscriptionSlug];
        return (model.durationInSeconds, model.priceInTalent, model.active);
    }

    /**
     * @notice Gets the total number of subscription models
     * @return The number of subscription models
     */
    function getTotalModels() external view returns (uint256) {
        return availableSubscriptionSlugs.length;
    }

    /**
     * @notice Gets the start time for a user's active subscription
     * @param wallet The wallet address of the user
     * @return The start timestamp (0 if no active subscription)
     */
    function getSubscriptionStartTime(address wallet) external view returns (uint256) {
        UserActiveSubscription memory active = userActiveSubscription[wallet];
        return active.startTime;
    }

    /**
     * @notice Gets the current active subscription for a user
     * @param wallet The wallet address of the user
     * @return subscriptionSlug The slug of the active subscription
     * @return expirationTime The expiration timestamp
     * @return startTime The start timestamp when subscription was set
     * @return isActive Whether the subscription is currently active
     */
    function getCurrentActiveSubscription(address wallet) external view returns (
        string memory subscriptionSlug,
        uint256 expirationTime,
        uint256 startTime,
        bool isActive
    ) {
        UserActiveSubscription memory active = userActiveSubscription[wallet];
        subscriptionSlug = active.subscriptionSlug;
        expirationTime = active.expirationTime;
        startTime = active.startTime;
        isActive = bytes(subscriptionSlug).length > 0 && expirationTime > block.timestamp;
    }
}
