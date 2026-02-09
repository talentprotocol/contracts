import { ethers, network } from "hardhat";
import type { TalentPlus } from "../../typechain-types";

// Network-specific addresses
const TALENT_PLUS_ADDRESS_MAINNET = "0x594d2b089CF372cACB02716c1Ee4522319aCdABB"; // TODO: Set actual mainnet address

// New subscription addresses to update to
const NEW_SUBSCRIPTION_ADDRESS_MAINNET = "0xc73AdcFf2210CbE77243425033A52827d13aDe3a"; // TODO: Set actual mainnet address

/**
 * Script to update the TalentPlusSubscription address in the TalentPlus contract
 * 
 * Usage:
 * npx hardhat run scripts/talent_plus/updateTalentPlusSubscription.ts --network <network>
 * 
 * Configuration:
 * Update the constants above with the appropriate addresses for each network
 */

async function main() {
  console.log(`🔄 Updating TalentPlusSubscription address on ${network.name}`);

  // Get network-specific addresses
  const talentPlusAddress: string = TALENT_PLUS_ADDRESS_MAINNET;
  
  const newSubscriptionAddress: string = NEW_SUBSCRIPTION_ADDRESS_MAINNET;

  // Validate addresses
  if (!ethers.utils.isAddress(talentPlusAddress) || talentPlusAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error(`❌ Invalid or unset TALENT_PLUS_ADDRESS for ${network.name}: ${talentPlusAddress}`);
  }

  if (!ethers.utils.isAddress(newSubscriptionAddress) || newSubscriptionAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error(`❌ Invalid or unset NEW_SUBSCRIPTION_ADDRESS for ${network.name}: ${newSubscriptionAddress}`);
  }

  if (talentPlusAddress.toLowerCase() === newSubscriptionAddress.toLowerCase()) {
    throw new Error("❌ TALENT_PLUS_ADDRESS and NEW_SUBSCRIPTION_ADDRESS cannot be the same");
  }

  const [admin] = await ethers.getSigners();
  console.log(`👤 Admin: ${admin.address}`);

  // Connect to the TalentPlus contract
  console.log(`🔗 Connecting to TalentPlus contract at: ${talentPlusAddress}`);
  const talentPlus = await ethers.getContractAt("TalentPlus", talentPlusAddress) as TalentPlus;

  // Verify admin is the owner
  const owner = await talentPlus.owner();
  if (owner.toLowerCase() !== admin.address.toLowerCase()) {
    throw new Error(`❌ Admin ${admin.address} is not the owner of TalentPlus contract. Owner is: ${owner}`);
  }

  // Get current subscription address
  const currentSubscriptionAddress: string = await talentPlus.talentPlusSubscription();
  console.log(`📋 Current TalentPlusSubscription address: ${currentSubscriptionAddress}`);

  if (currentSubscriptionAddress.toLowerCase() === newSubscriptionAddress.toLowerCase()) {
    console.log("⚠️  The new subscription address is the same as the current one. No update needed.");
    return;
  }

  // Verify the new subscription contract exists and is a contract
  console.log(`🔍 Verifying new subscription contract at: ${newSubscriptionAddress}`);
  try {
    const code = await ethers.provider.getCode(newSubscriptionAddress);
    if (code === "0x") {
      throw new Error("❌ No contract found at the new subscription address");
    }
    console.log("✅ New subscription contract verified");
  } catch (error) {
    throw new Error(`❌ Failed to verify new subscription contract: ${error}`);
  }

  // Confirm the update
  console.log("\n📝 Update Summary:");
  console.log("=" .repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`TalentPlus Contract: ${talentPlusAddress}`);
  console.log(`Current Subscription: ${currentSubscriptionAddress}`);
  console.log(`New Subscription: ${newSubscriptionAddress}`);
  console.log(`Admin: ${admin.address}`);
  console.log("=" .repeat(60));

  // Estimate gas for the transaction
  console.log("\n⛽ Estimating gas...");
  try {
    const gasEstimate = await talentPlus.estimateGas.updateTalentPlusSubscription(newSubscriptionAddress);
    console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);
  } catch (error) {
    console.error("❌ Gas estimation failed:", error);
    throw error;
  }

  // Execute the update
  console.log("\n🚀 Updating TalentPlusSubscription address...");
  let tx, receipt;
  try {
    tx = await talentPlus.updateTalentPlusSubscription(newSubscriptionAddress);
    console.log(`📤 Transaction submitted: ${tx.hash}`);
    
    console.log("⏳ Waiting for confirmation...");
    receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
  } catch (error) {
    console.error("❌ Update transaction failed:", error);
    throw error;
  }

  // Verify the update
  console.log("\n🔍 Verifying the update...");
  const updatedSubscriptionAddress: string = await talentPlus.talentPlusSubscription();
  
  if (updatedSubscriptionAddress.toLowerCase() === newSubscriptionAddress.toLowerCase()) {
    console.log("✅ Update verified successfully!");
  } else {
    throw new Error(`❌ Update verification failed. Expected: ${newSubscriptionAddress}, Got: ${updatedSubscriptionAddress}`);
  }

  // Final summary
  console.log("\n🎉 Update Summary:");
  console.log("=" .repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`TalentPlus Contract: ${talentPlusAddress}`);
  console.log(`Previous Subscription: ${currentSubscriptionAddress}`);
  console.log(`New Subscription: ${updatedSubscriptionAddress}`);
  console.log(`Transaction Hash: ${tx.hash}`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log("=" .repeat(60));

  console.log("\n📝 Next Steps:");
  console.log("1. Verify the update on block explorer");
  console.log("2. Test the new subscription functionality");
  console.log("3. Update any frontend configurations if needed");
  console.log("4. Consider updating trusted signers if the new subscription contract has different requirements");

  console.log("\n✅ TalentPlusSubscription address update completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Update failed:", error);
    process.exit(1);
  });
