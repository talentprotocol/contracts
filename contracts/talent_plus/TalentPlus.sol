// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TalentPlusSubscription.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interface for the vault contract to get staked amounts
interface ITalentVault {
    function balanceOf(address account) external view returns (uint256);
}

contract TalentPlus is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public feeReceiver;
    TalentPlusSubscription public talentPlusSubscription;
    address public paymentToken;
    
    // TALENT token address for balance checking
    IERC20 public immutable TALENT_TOKEN;
    // Array of vault addresses to check staked amounts
    address[] public vaultAddresses;

    event SubscriptionCreated(address indexed payer, address indexed recipient, string subscriptionSlug, uint256 pricePaid, bool discountApplied);
    event VaultAddressAdded(address indexed vaultAddress);
    event VaultAddressRemoved(address indexed vaultAddress);

    bool public enabled;

    constructor(
        address _talentPlusSubscriptionAddress,
        address _feeReceiver,
        address _paymentToken,
        address _talentTokenAddress,
        address[] memory _initialVaultAddresses
    ) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid payment token address");
        require(_talentTokenAddress != address(0), "Invalid TALENT token address");
        talentPlusSubscription = TalentPlusSubscription(_talentPlusSubscriptionAddress);
        feeReceiver = _feeReceiver;
        paymentToken = _paymentToken;
        TALENT_TOKEN = IERC20(_talentTokenAddress);
        
        // Add initial vault addresses
        for (uint256 i = 0; i < _initialVaultAddresses.length; i++) {
            require(_initialVaultAddresses[i] != address(0), "Invalid vault address");
            vaultAddresses.push(_initialVaultAddresses[i]);
        }
        
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
     * @notice Adds a vault address to the list of vaults to check for staked amounts
     * @param vaultAddress The vault address to add
     * @dev Can only be called by the owner
     */
    function addVaultAddress(address vaultAddress) external onlyOwner {
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
     * @dev Can only be called by the owner
     */
    function removeVaultAddress(address vaultAddress) external onlyOwner {
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
            totalStaked += ITalentVault(vaultAddresses[i]).balanceOf(wallet);
        }
        return totalStaked;
    }

    /**
     * @notice Calculates the discounted price for a subscription based on TALENT holdings (balance + vault staking across all vaults)
     * @param subscriptionSlug The subscription slug
     * @param wallet The wallet address to check TALENT balance and vault staking for
     * @return finalPrice The final price after applying discount (if applicable)
     * @return discountApplied Whether a discount was applied
     * @return discountAmount The amount of discount applied (0 if no discount)
     */
    function calculateDiscountedPrice(string memory subscriptionSlug, address wallet) public view returns (uint256 finalPrice, bool discountApplied, uint256 discountAmount) {
        require(bytes(subscriptionSlug).length > 0, "Subscription slug cannot be empty");
        require(wallet != address(0), "Invalid wallet address");
        
        // Get subscription model details from subscription contract
        (, uint256 price, uint256 discountPercentage, uint256 talentRequiredForDiscount, bool active) = talentPlusSubscription.getSubscriptionModel(subscriptionSlug);
        require(active, "Subscription model is not active");
        
        // Calculate total TALENT holdings (balance + vault staking)
        uint256 talentBalance = TALENT_TOKEN.balanceOf(wallet);
        uint256 vaultStaked = _getTotalVaultStaked(wallet);
        uint256 totalTalentHoldings = talentBalance + vaultStaked;
        
        // Check if wallet qualifies for discount (TALENT balance + vault staking)
        if (totalTalentHoldings >= talentRequiredForDiscount && discountPercentage > 0) {
            discountAmount = (price * discountPercentage) / 100;
            finalPrice = price - discountAmount;
            discountApplied = true;
        } else {
            finalPrice = price;
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
        
        // Calculate discounted price based on TALENT holdings (this contract handles the calculation)
        (uint256 finalPrice, bool discountApplied,) = calculateDiscountedPrice(subscriptionSlug, wallet);
        require(tokenAmount >= finalPrice, "Insufficient token payment");
        
        // Transfer full token amount from user to this contract first
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), tokenAmount);
        
        // Transfer the required price to fee receiver
        IERC20(paymentToken).safeTransfer(feeReceiver, finalPrice);
        
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
