// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface for the vault contract to get staked amounts
interface IVault {
    function balanceOf(address account) external view returns (uint256);
}

contract TalentPlusSubscription is Ownable, ReentrancyGuard {

    // TALENT token address for balance checking
    IERC20 public immutable TALENT_TOKEN;
    // Array of vault addresses to check staked amounts
    address[] public vaultAddresses;

    // Mapping to store trusted signers
    mapping(address => bool) public trustedSigners;

    // Subscription model structure
    struct SubscriptionModel {
        string subscriptionSlug;
        uint256 durationInSeconds;
        uint256 price; // Price in USDC (6 decimals)
        uint256 discountPercentage; // Discount percentage (e.g., 10 for 10% discount)
        uint256 talentRequiredForDiscount; // Amount of TALENT tokens required for discount
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
    
    // Array to store only active subscription slugs (for efficient retrieval)
    string[] public activeSubscriptionSlugs;

    // User active subscription: wallet => UserActiveSubscription
    mapping(address => UserActiveSubscription) public userActiveSubscription;

    // Events
    event SubscriptionModelAdded(string subscriptionSlug, uint256 durationInSeconds, uint256 price, uint256 discountPercentage, uint256 talentRequiredForDiscount);
    event SubscriptionModelUpdated(string subscriptionSlug, uint256 durationInSeconds, uint256 price, uint256 discountPercentage, uint256 talentRequiredForDiscount);
    event SubscriptionModelDeactivated(string subscriptionSlug);
    event UserSubscriptionAdded(address indexed wallet, string subscriptionSlug, uint256 expirationTime, uint256 startTime, address payer, uint256 pricePaid);
    event UserSubscriptionExtended(address indexed wallet, string subscriptionSlug, uint256 expirationTime, uint256 startTime, address payer, uint256 pricePaid);
    event TrustedSignerAdded(address indexed signer);
    event TrustedSignerRemoved(address indexed signer);
    event VaultAddressAdded(address indexed vaultAddress);
    event VaultAddressRemoved(address indexed vaultAddress);

    constructor(address initialOwner, address talentTokenAddress, address[] memory initialVaultAddresses) Ownable(initialOwner) {
        trustedSigners[initialOwner] = true;
        TALENT_TOKEN = IERC20(talentTokenAddress);
        
        // Add initial vault addresses
        for (uint256 i = 0; i < initialVaultAddresses.length; i++) {
            require(initialVaultAddresses[i] != address(0), "Invalid vault address");
            vaultAddresses.push(initialVaultAddresses[i]);
        }
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
     * @notice Adds a vault address to the list of vaults to check for staked amounts
     * @param vaultAddress The vault address to add
     * @dev Can only be called by the owner or trusted signers
     */
    function addVaultAddress(address vaultAddress) external {
        require(owner() == msg.sender || trustedSigners[msg.sender], "Only owner or trusted signers can add vault addresses");
        require(vaultAddress != address(0), "Invalid vault address");
        
        // Check if vault address already exists
        for (uint256 i = 0; i < vaultAddresses.length; i++) {
            require(vaultAddresses[i] != vaultAddress, "Vault address already exists");
        }
        
        vaultAddresses.push(vaultAddress);
        emit VaultAddressAdded(vaultAddress);
    }

    /**
     * @notice Removes a vault address from the list of vaults
     * @param vaultAddress The vault address to remove
     * @dev Can only be called by the owner or trusted signers
     */
    function removeVaultAddress(address vaultAddress) external {
        require(owner() == msg.sender || trustedSigners[msg.sender], "Only owner or trusted signers can remove vault addresses");
        
        bool found = false;
        for (uint256 i = 0; i < vaultAddresses.length; i++) {
            if (vaultAddresses[i] == vaultAddress) {
                // Move the last element to the position of the element to delete
                vaultAddresses[i] = vaultAddresses[vaultAddresses.length - 1];
                // Remove the last element
                vaultAddresses.pop();
                found = true;
                break;
            }
        }
        
        require(found, "Vault address not found");
        emit VaultAddressRemoved(vaultAddress);
    }

    /**
     * @notice Gets all vault addresses
     * @return An array of all vault addresses
     */
    function getVaultAddresses() external view returns (address[] memory) {
        return vaultAddresses;
    }

    /**
     * @notice Gets the total number of vault addresses
     * @return The number of vault addresses
     */
    function getVaultAddressCount() external view returns (uint256) {
        return vaultAddresses.length;
    }

    /**
     * @notice Helper function to calculate total staked amount across all vaults
     * @param wallet The wallet address to check
     * @return totalStaked The total amount staked across all vaults
     */
    function _getTotalVaultStaked(address wallet) internal view returns (uint256 totalStaked) {
        totalStaked = 0;
        for (uint256 i = 0; i < vaultAddresses.length; i++) {
            totalStaked += IVault(vaultAddresses[i]).balanceOf(wallet);
        }
        return totalStaked;
    }

    /**
     * @notice Adds a new subscription model
     * @param subscriptionSlug The subscription slug string for the subscription model
     * @param durationInSeconds The duration of the subscription in seconds
     * @param price The price in USDC (6 decimals)
     * @param discountPercentage The discount percentage (e.g., 10 for 10% discount)
     * @param talentRequiredForDiscount The amount of TALENT tokens required for discount
     * @dev Can only be called by the owner or trusted signers
     */
    function addSubscriptionModel(
        string memory subscriptionSlug,
        uint256 durationInSeconds,
        uint256 price,
        uint256 discountPercentage,
        uint256 talentRequiredForDiscount
    ) external {
        require(owner() == msg.sender || trustedSigners[msg.sender], "Only owner or trusted signers can add subscription models");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        require(durationInSeconds > 0, "Duration must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        require(discountPercentage <= 100, "Discount percentage cannot exceed 100%");
        require(!subscriptionModels[subscriptionSlug].active, "Subscription model already exists");
        
        subscriptionModels[subscriptionSlug] = SubscriptionModel({
            subscriptionSlug: subscriptionSlug,
            durationInSeconds: durationInSeconds,
            price: price,
            discountPercentage: discountPercentage,
            talentRequiredForDiscount: talentRequiredForDiscount,
            active: true
        });
        
        availableSubscriptionSlugs.push(subscriptionSlug);
        activeSubscriptionSlugs.push(subscriptionSlug);
        
        emit SubscriptionModelAdded(subscriptionSlug, durationInSeconds, price, discountPercentage, talentRequiredForDiscount);
    }

    /**
     * @notice Updates an existing subscription model
     * @param subscriptionSlug The subscription slug of the subscription model to update
     * @param durationInSeconds The new duration in seconds
     * @param price The new price in USDC (6 decimals)
     * @param discountPercentage The new discount percentage (e.g., 10 for 10% discount)
     * @param talentRequiredForDiscount The new amount of TALENT tokens required for discount
     * @dev Can only be called by the owner or trusted signers
     */
    function updateSubscriptionModel(
        string memory subscriptionSlug,
        uint256 durationInSeconds,
        uint256 price,
        uint256 discountPercentage,
        uint256 talentRequiredForDiscount
    ) external {
        require(owner() == msg.sender || trustedSigners[msg.sender], "Only owner or trusted signers can update subscription models");
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        require(subscriptionModels[subscriptionSlug].active, "Subscription model does not exist");
        require(durationInSeconds > 0, "Duration must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        require(discountPercentage <= 100, "Discount percentage cannot exceed 100%");

        subscriptionModels[subscriptionSlug].durationInSeconds = durationInSeconds;
        subscriptionModels[subscriptionSlug].price = price;
        subscriptionModels[subscriptionSlug].discountPercentage = discountPercentage;
        subscriptionModels[subscriptionSlug].talentRequiredForDiscount = talentRequiredForDiscount;

        emit SubscriptionModelUpdated(subscriptionSlug, durationInSeconds, price, discountPercentage, talentRequiredForDiscount);
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
        
        // Remove from active subscription slugs array
        for (uint256 i = 0; i < activeSubscriptionSlugs.length; i++) {
            if (keccak256(bytes(activeSubscriptionSlugs[i])) == keccak256(bytes(subscriptionSlug))) {
                // Move the last element to the position of the element to delete
                activeSubscriptionSlugs[i] = activeSubscriptionSlugs[activeSubscriptionSlugs.length - 1];
                // Remove the last element
                activeSubscriptionSlugs.pop();
                break;
            }
        }

        emit SubscriptionModelDeactivated(subscriptionSlug);
    }

    /**
     * @notice Adds or extends a user subscription for a specific model
     * @param wallet The wallet address of the user
     * @param subscriptionSlug The subscription slug of the subscription model to add/extend
     * @dev Can only be called by trusted signers
     * @dev Extends existing subscription if same type (preserves original start time)
     * @dev Extends existing subscription if different type (preserves remaining time + adds new duration)
     * @dev Always preserves user's paid time - users never lose subscription days
     */
    function addUserSubscription(address wallet, string memory subscriptionSlug, address payer, uint256 pricePaid) external nonReentrant {
        require(trustedSigners[msg.sender], "Only trusted signers can add user subscriptions");
        require(wallet != address(0), "Invalid wallet address");
        require(payer != address(0), "Invalid payer address");
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
                    emit UserSubscriptionExtended(wallet, subscriptionSlug, newExpirationTime, currentActive.startTime, payer, pricePaid);
                    return;
                } else {
                    // Different subscription model - always allow extension (preserve remaining time + add new duration)
                    // This allows users to extend premium subscriptions with basic subscriptions, etc.
                    uint256 remainingTime = currentActive.expirationTime > block.timestamp ? 
                        currentActive.expirationTime - block.timestamp : 0;
                    uint256 newExpirationTime = block.timestamp + remainingTime + newModel.durationInSeconds;
                    
                    userActiveSubscription[wallet] = UserActiveSubscription({
                        subscriptionSlug: subscriptionSlug,
                        expirationTime: newExpirationTime,
                        startTime: block.timestamp // New start time for different subscription type
                    });
                    emit UserSubscriptionExtended(wallet, subscriptionSlug, newExpirationTime, block.timestamp, payer, pricePaid);
                    return;
                }
            }
        }

        // Calculate expiration time for new subscription (no existing active subscription)
        uint256 currentTime = block.timestamp;
        uint256 expirationTime = currentTime + newModel.durationInSeconds;

        // This handles cases where user has no active subscription or subscription has expired
        emit UserSubscriptionAdded(wallet, subscriptionSlug, expirationTime, currentTime, payer, pricePaid);

        // Update user subscription
        userActiveSubscription[wallet] = UserActiveSubscription({
            subscriptionSlug: subscriptionSlug,
            expirationTime: expirationTime,
            startTime: currentTime
        });
    }

    /**
     * @notice Adds or extends a user subscription with a specific expiration time
     * @param wallet The wallet address of the user
     * @param expirationTime The specific expiration timestamp for the subscription
     * @dev Can only be called by trusted signers
     * @dev Allows setting custom expiration times for administrative purposes
     * @dev Extends existing subscription if one exists, adds new subscription if none exists
     * @dev Automatically sets subscription slug as "custom"
     */
    function addUserSubscriptionWithExpiration(
        address wallet,
        uint256 expirationTime
    ) external nonReentrant {
        require(trustedSigners[msg.sender], "Only trusted signers can add user subscriptions");
        require(wallet != address(0), "Invalid wallet address");
        require(expirationTime > block.timestamp, "Expiration time must be in the future");

        string memory subscriptionSlug = "custom";

        // Get current active subscription
        UserActiveSubscription memory currentActive = userActiveSubscription[wallet];

        // If user has an active subscription, emit extension event
        if (bytes(currentActive.subscriptionSlug).length > 0) {
            emit UserSubscriptionExtended(wallet, subscriptionSlug, expirationTime, block.timestamp, msg.sender, 0);
        } else {
            emit UserSubscriptionAdded(wallet, subscriptionSlug, expirationTime, block.timestamp, msg.sender, 0);
        }

        // Update user subscription with custom expiration time
        userActiveSubscription[wallet] = UserActiveSubscription({
            subscriptionSlug: subscriptionSlug,
            expirationTime: expirationTime,
            startTime: block.timestamp
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
     * @return price The price in USDC (6 decimals)
     * @return discountPercentage The discount percentage
     * @return talentRequiredForDiscount The amount of TALENT tokens required for discount
     * @return active Whether the model is active
     */
    function getSubscriptionModel(string memory subscriptionSlug) external view returns (
        uint256 durationInSeconds,
        uint256 price,
        uint256 discountPercentage,
        uint256 talentRequiredForDiscount,
        bool active
    ) {
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        
        SubscriptionModel memory model = subscriptionModels[subscriptionSlug];
        return (model.durationInSeconds, model.price, model.discountPercentage, model.talentRequiredForDiscount, model.active);
    }

    /**
     * @notice Calculates the discounted price for a subscription based on TALENT holdings (balance + vault staking across all vaults)
     * @param subscriptionSlug The subscription slug
     * @param wallet The wallet address to check TALENT balance and vault staking for
     * @return finalPrice The final price after applying discount (if applicable)
     * @return discountApplied Whether a discount was applied
     * @return discountAmount The amount of discount applied (0 if no discount)
     */
    function calculateDiscountedPrice(string memory subscriptionSlug, address wallet) external view returns (uint256 finalPrice, bool discountApplied, uint256 discountAmount) {
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        require(wallet != address(0), "Invalid wallet address");
        
        SubscriptionModel memory model = subscriptionModels[subscriptionSlug];
        require(model.active, "Subscription model is not active");
        
        uint256 talentBalance = TALENT_TOKEN.balanceOf(wallet);
        uint256 vaultStaked = _getTotalVaultStaked(wallet);
        uint256 totalTalentHoldings = talentBalance + vaultStaked;
        
        // Check if wallet qualifies for discount (TALENT balance + vault staking)
        if (totalTalentHoldings >= model.talentRequiredForDiscount && model.discountPercentage > 0) {
            discountAmount = (model.price * model.discountPercentage) / 100;
            finalPrice = model.price - discountAmount;
            discountApplied = true;
        } else {
            finalPrice = model.price;
            discountApplied = false;
            discountAmount = 0;
        }
        
        return (finalPrice, discountApplied, discountAmount);
    }

    /**
     * @notice Gets the total TALENT holdings for a user (balance + vault staking across all vaults)
     * @param wallet The wallet address to check TALENT holdings for
     * @return totalTalentHoldings The total TALENT holdings (balance + vault staked across all vaults)
     * @return talentBalance The TALENT token balance in the wallet
     * @return vaultStaked The TALENT tokens staked across all vaults
     */
    function getUserTalentHoldings(address wallet) external view returns (
        uint256 totalTalentHoldings,
        uint256 talentBalance,
        uint256 vaultStaked
    ) {
        require(wallet != address(0), "Invalid wallet address");
        
        talentBalance = TALENT_TOKEN.balanceOf(wallet);
        vaultStaked = _getTotalVaultStaked(wallet);
        totalTalentHoldings = talentBalance + vaultStaked;
        
        return (totalTalentHoldings, talentBalance, vaultStaked);
    }

    /**
     * @notice Gets the total number of subscription models
     * @return The number of subscription models
     */
    function getTotalModels() external view returns (uint256) {
        return availableSubscriptionSlugs.length;
    }

    /**
     * @notice Gets all active subscription slugs
     * @return An array of active subscription slugs
     */
    function getActiveSubscriptionSlugs() external view returns (string[] memory) {
        return activeSubscriptionSlugs;
    }

    /**
     * @notice Gets the count of active subscription models
     * @return The number of active subscription models
     */
    function getActiveSubscriptionCount() external view returns (uint256) {
        return activeSubscriptionSlugs.length;
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
