import { ethers, network } from "hardhat";
import { TalentPlusSubscription } from "../../typechain-types";
import fs from "fs";
import path from "path";

// Interface for the JSON data structure
interface CustomSubscription {
  wallet: string;
  expirationTime: number;
}

// Configuration
const BATCH_SIZE = 10; // Process subscriptions in batches to avoid gas limits

// Contract and file configuration
const CONTRACT_ADDRESS = "0x899BB212C0a132826E08810ac4D621cf02d61be0";
const JSON_FILE_PATH = "scripts/talent_plus/migrate_subscriptions.json";

async function main() {
  console.log(`Creating custom subscriptions on ${network.name}`);

  const [admin] = await ethers.getSigners();
  console.log(`Admin: ${admin.address}`);

  // Use the configured contract address and JSON file path
  const contractAddress = CONTRACT_ADDRESS;
  const jsonFilePath = JSON_FILE_PATH;

  // Validate JSON file exists
  const fullPath = path.resolve(jsonFilePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ ERROR: JSON file not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading subscriptions from: ${fullPath}`);

  // Read and parse JSON file
  let subscriptions: CustomSubscription[];
  try {
    const jsonData = fs.readFileSync(fullPath, 'utf8');
    subscriptions = JSON.parse(jsonData);
    
    if (!Array.isArray(subscriptions)) {
      throw new Error("JSON file must contain an array of subscription objects");
    }
  } catch (error) {
    console.error("❌ ERROR parsing JSON file:", error);
    process.exit(1);
  }

  console.log(`📊 Found ${subscriptions.length} subscriptions to process`);

  // Validate subscription data
  const currentTime = Math.floor(Date.now() / 1000);
  const invalidSubscriptions: number[] = [];

  subscriptions.forEach((sub, index) => {
    if (!sub.wallet || !sub.expirationTime) {
      invalidSubscriptions.push(index);
      return;
    }

    // Validate wallet address
    if (!ethers.utils.isAddress(sub.wallet)) {
      invalidSubscriptions.push(index);
      return;
    }

    // Validate expiration time is in the future
    if (sub.expirationTime <= currentTime) {
      invalidSubscriptions.push(index);
      return;
    }
  });

  if (invalidSubscriptions.length > 0) {
    console.error(`❌ ERROR: Found ${invalidSubscriptions.length} invalid subscriptions at indices:`, invalidSubscriptions);
    console.log("Each subscription must have:");
    console.log("- wallet: valid Ethereum address");
    console.log("- expirationTime: Unix timestamp in the future");
    process.exit(1);
  }

  // Connect to TalentPlusSubscription contract
  const talentPlusSubscription = await ethers.getContractAt("TalentPlusSubscription", contractAddress) as TalentPlusSubscription;

  // Verify admin is a trusted signer
  const isTrustedSigner = await talentPlusSubscription.isTrustedSigner(admin.address);
  if (!isTrustedSigner) {
    console.error("❌ ERROR: Admin address is not a trusted signer in TalentPlusSubscription");
    console.log(`Admin address: ${admin.address}`);
    console.log("Please add the admin as a trusted signer first using the contract's addTrustedSigner function");
    process.exit(1);
  }

  console.log("✅ Admin is verified as trusted signer");

  // Process subscriptions in batches
  const totalBatches = Math.ceil(subscriptions.length / BATCH_SIZE);
  let successCount = 0;
  let failureCount = 0;
  const failures: { index: number; wallet: string; error: string }[] = [];

  console.log(`\n🚀 Processing ${subscriptions.length} subscriptions in ${totalBatches} batches of ${BATCH_SIZE}...`);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, subscriptions.length);
    const batch = subscriptions.slice(startIndex, endIndex);

    console.log(`\n📦 Processing batch ${batchIndex + 1}/${totalBatches} (subscriptions ${startIndex + 1}-${endIndex})`);

    // Process each subscription in the batch
    for (let i = 0; i < batch.length; i++) {
      const subscription = batch[i];
      const globalIndex = startIndex + i;

      try {
        console.log(`  ${globalIndex + 1}/${subscriptions.length}: Processing ${subscription.wallet}...`);

        // Check if user already has a subscription
        const hasActiveSubscription = await talentPlusSubscription.hasActiveSubscription(subscription.wallet);
        if (hasActiveSubscription) {
          const [currentSlug, currentExpiration] = await talentPlusSubscription.getCurrentActiveSubscription(subscription.wallet);
          console.log(`    ⚠️  User already has active subscription: ${currentSlug} (expires: ${new Date(currentExpiration.toNumber() * 1000).toISOString()})`);
          console.log(`    🔄 Replacing with new custom subscription...`);
        }

        // Create custom subscription
        const tx = await talentPlusSubscription.addUserSubscriptionWithExpiration(
          subscription.wallet,
          subscription.expirationTime
        );

        await tx.wait();
        console.log(`    ✅ Success! Transaction: ${tx.hash}`);

        successCount++;

      } catch (error) {
        console.error(`    ❌ Failed for ${subscription.wallet}:`, error.message || error);
        failureCount++;
        failures.push({
          index: globalIndex,
          wallet: subscription.wallet,
          error: error.message || String(error)
        });
      }
    }

    // Add a small delay between batches to avoid overwhelming the network
    if (batchIndex < totalBatches - 1) {
      console.log("    ⏳ Waiting 2 seconds before next batch...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 PROCESSING SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total subscriptions: ${subscriptions.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📄 Contract: ${contractAddress}`);
  console.log(`🌐 Network: ${network.name}`);

  if (failures.length > 0) {
    console.log("\n❌ FAILURES:");
    failures.forEach(failure => {
      console.log(`  ${failure.index + 1}: ${failure.wallet} - ${failure.error}`);
    });

    // Save failures to a file for review
    const failuresPath = path.join(process.cwd(), `subscription_failures_${Date.now()}.json`);
    fs.writeFileSync(failuresPath, JSON.stringify(failures, null, 2));
    console.log(`\n💾 Failures saved to: ${failuresPath}`);
  }

  console.log("\n✅ Custom subscription creation completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
