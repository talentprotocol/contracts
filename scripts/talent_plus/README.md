# Subscription Management Scripts

This directory contains scripts for managing TalentPlus subscription models.

## Scripts

### 1. `manageSubscriptions.ts` - Production Script

This script manages subscriptions on the production contract at `0xE9feF6DDc821Fddc6Fc9AD775e23014Bc17d996E`.

**What it does:**
- Disables all current subscription models
- Adds a new yearly subscription model with:
  - Duration: 1 year (365 days)
  - Price: 0.0001 ETH
  - Discount: 100% for holders of 100k+ TALENT tokens
  - Users with 100k+ TALENT get 100% discount (pay 0 ETH)
  - Users with <100k TALENT pay full price (0.0001 ETH)

**Usage:**
```bash
npx hardhat run scripts/talent_plus/manageSubscriptions.ts --network <network_name>
```

**Requirements:**
- The admin address must be a trusted signer in the TalentPlusSubscription contract
- The contract must be deployed and accessible

### 2. `manageSubscriptionsTest.ts` - Test Script

This script is designed for testing purposes. It:
- Deploys a new TalentPlusSubscription contract on hardhat network
- Adds initial subscription models for testing
- Performs the same subscription management as the production script

**Usage:**
```bash
npx hardhat run scripts/talent_plus/manageSubscriptionsTest.ts --network hardhat
```

### 3. `updateTalentPlusSubscription.ts` - Update Subscription Contract Address

This script updates the TalentPlusSubscription contract address in the TalentPlus contract. This is useful when:
- Deploying a new version of the TalentPlusSubscription contract
- Switching between different subscription contract implementations
- Updating contract addresses after redeployment

**What it does:**
- Validates the current TalentPlus contract and new subscription address
- Verifies that the admin is the owner of the TalentPlus contract
- Checks that the new subscription contract exists and is valid
- Updates the subscription address using the `updateTalentPlusSubscription()` function
- Verifies the update was successful

**Usage:**
```bash
# Update the constants in the script file with the appropriate addresses
# Then run the script
npx hardhat run scripts/talent_plus/updateTalentPlusSubscription.ts --network <network_name>
```

**Configuration:**
Update the following constants in the script file:
- `TALENT_PLUS_ADDRESS_MAINNET`: Address of the TalentPlus contract on mainnet
- `TALENT_PLUS_ADDRESS_TESTNET`: Address of the TalentPlus contract on testnet
- `NEW_SUBSCRIPTION_ADDRESS_MAINNET`: New TalentPlusSubscription contract address for mainnet
- `NEW_SUBSCRIPTION_ADDRESS_TESTNET`: New TalentPlusSubscription contract address for testnet

**Requirements:**
- The admin address must be the owner of the TalentPlus contract
- The new subscription contract must be deployed and accessible
- Both addresses must be valid Ethereum addresses

## Configuration

### Yearly Subscription Model Configuration

The yearly subscription model is configured with the following parameters:

```typescript
const YEARLY_SUBSCRIPTION_CONFIG = {
  slug: "yearly",
  durationInSeconds: 365 * 24 * 60 * 60, // 1 year in seconds
  priceInEth: ethers.utils.parseEther("0.0001"), // 0.0001 ETH
  discountPercentage: 100, // 100% discount
  talentRequiredForDiscount: ethers.utils.parseEther("100000") // 100k TALENT
};
```

### Network-Specific Addresses

The scripts use different addresses based on the network:

- **TALENT Token Address:**
  - Mainnet: `0x9a33406165f562E16C3abD82fd1185482E01b49a`
  - Testnet: `0x9a33406165f562E16C3abD82fd1185482E01b49a`

- **Vault Address:**
  - Mainnet: `0x23Ff3256A29847d7EF760943bd6679b565CbdE5a`
  - Testnet: `0x23Ff3256A29847d7EF760943bd6679b565CbdE5a`

## How It Works

### Step 1: Deactivate Existing Models
The script first retrieves all existing subscription models and deactivates them by calling `deactivateSubscriptionModel()` for each active model.

### Step 2: Add New Yearly Model
The script adds a new subscription model with the slug "yearly" using `addSubscriptionModel()` with the configured parameters.

### Step 3: Verify Changes
The script verifies that:
- The new model was added successfully
- The model details match the configuration
- The model is active

### Step 4: Test Price Calculations
The script tests the price calculation functionality for different scenarios:
- Wallet with TALENT holdings (should get 100% discount)
- Wallet without TALENT holdings (should pay full price)

## Security Considerations

- Only trusted signers can modify subscription models
- The admin address must be added as a trusted signer before running the script
- All transactions are logged with their hash for audit purposes

## Error Handling

The scripts include comprehensive error handling:
- Validates admin permissions before execution
- Handles network-specific issues gracefully
- Provides detailed error messages and suggestions
- Continues execution even if some operations fail

## Output

The scripts provide detailed output including:
- Current subscription models
- Deactivation status for each model
- New model creation confirmation
- Verification of changes
- Price calculation tests
- Summary of all changes made

## Example Output

### Subscription Management Script Output
```
📊 SUBSCRIPTION MANAGEMENT SUMMARY
============================================================
Network: mainnet
Contract: 0xE9feF6DDc821Fddc6Fc9AD775e23014Bc17d996E
Admin: 0x...
Total Models Before: 3
Total Models After: 4
Models Deactivated: 3
New Model Added: yearly
============================================================

✅ Subscription management completed successfully!

📝 Summary of Changes:
- Deactivated 3 existing subscription models
- Added new "yearly" subscription model
- Duration: 1 year (365 days)
- Price: 0.0001 ETH
- Discount: 100% for holders of 100000.0 TALENT
- Users with 100k+ TALENT get 100% discount (pay 0 ETH)
- Users with <100k TALENT pay full price (0.0001 ETH)
```

### Update Subscription Address Script Output
```
🔄 Updating TalentPlusSubscription address on mainnet
👤 Admin: 0x...
🔗 Connecting to TalentPlus contract at: 0x...
📋 Current TalentPlusSubscription address: 0x...
🔍 Verifying new subscription contract at: 0x...
✅ New subscription contract verified

📝 Update Summary:
============================================================
Network: mainnet
TalentPlus Contract: 0x...
Current Subscription: 0x...
New Subscription: 0x...
Admin: 0x...
============================================================

⛽ Estimating gas...
✅ Gas estimate: 45000
🚀 Updating TalentPlusSubscription address...
📤 Transaction submitted: 0x...
⏳ Waiting for confirmation...
✅ Transaction confirmed in block: 12345678
⛽ Gas used: 42000

🔍 Verifying the update...
✅ Update verified successfully!

🎉 Update Summary:
============================================================
Network: mainnet
TalentPlus Contract: 0x...
Previous Subscription: 0x...
New Subscription: 0x...
Transaction Hash: 0x...
Block Number: 12345678
============================================================

📝 Next Steps:
1. Verify the update on block explorer
2. Test the new subscription functionality
3. Update any frontend configurations if needed
4. Consider updating trusted signers if the new subscription contract has different requirements

✅ TalentPlusSubscription address update completed successfully!
```