# Custom Subscriptions Script

This script allows you to create custom subscriptions for multiple users by reading wallet addresses and expiration times from a JSON file.

## Usage

```bash
npx hardhat run scripts/talent_plus/createCustomSubscriptions.ts --network <network_name> <contract_address> <json_file_path>
```

### Parameters

- `<network_name>`: The Hardhat network to deploy to (e.g., `localhost`, `mainnet`, `testnet`)
- `<contract_address>`: The address of the deployed TalentPlusSubscription contract
- `<json_file_path>`: Path to the JSON file containing subscription data

### Example

```bash
npx hardhat run scripts/talent_plus/createCustomSubscriptions.ts --network localhost 0x1234567890123456789012345678901234567890 sample_subscriptions.json
```

## JSON File Format

The JSON file must contain an array of objects with the following structure:

```json
[
  {
    "wallet": "0x1234567890123456789012345678901234567890",
    "expirationTime": 1735689600
  },
  {
    "wallet": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "expirationTime": 1735776000
  }
]
```

### Field Descriptions

- `wallet`: Ethereum wallet address (must be valid address format)
- `expirationTime`: Unix timestamp (seconds since epoch) - must be in the future

## Features

- **Batch Processing**: Processes subscriptions in batches of 10 to avoid gas limit issues
- **Validation**: Validates wallet addresses and expiration times before processing
- **Error Handling**: Continues processing even if some subscriptions fail
- **Progress Tracking**: Shows detailed progress for each subscription
- **Failure Reporting**: Saves failed subscriptions to a JSON file for review
- **Duplicate Handling**: Warns if a user already has an active subscription and replaces it

## Prerequisites

1. **Trusted Signer**: The admin account must be added as a trusted signer in the TalentPlusSubscription contract
2. **Contract Deployment**: The TalentPlusSubscription contract must be deployed
3. **Network Configuration**: Hardhat network must be properly configured

## Sample Data

A sample JSON file (`sample_subscriptions.json`) is included for testing purposes.

## Error Handling

The script will:
- Validate all data before processing
- Continue processing even if individual subscriptions fail
- Save failed subscriptions to a timestamped JSON file
- Provide detailed error messages for each failure

## Output

The script provides:
- Real-time progress updates
- Success/failure counts
- Transaction hashes for successful operations
- Detailed failure report if any subscriptions fail
- Summary statistics at the end
