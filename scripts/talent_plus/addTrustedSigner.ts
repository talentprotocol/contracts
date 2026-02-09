import { ethers, network } from "hardhat";
import type { TalentPlusSubscription } from "../../typechain-types";

// Contract addresses
const TALENT_PLUS_SUBSCRIPTION_ADDRESS = "0xc73AdcFf2210CbE77243425033A52827d13aDe3a";

// Trusted signer address to add
const TRUSTED_SIGNER_ADDRESS = "0x594d2b089CF372cACB02716c1Ee4522319aCdABB"; // TalentPlus contract address

/**
 * Script to add trusted signers to the TalentPlusSubscription contract
 * 
 * Usage:
 * npx hardhat run scripts/talent_plus/addTrustedSigner.ts --network <network>
 * 
 * Configuration:
 * Update the constants above with the appropriate addresses before running.
 * 
 * Note: Make sure the signer account has owner or trusted signer permissions.
 */

async function main() {
  console.log(`🔐 Adding trusted signer to TalentPlusSubscription on ${network.name}`);

  // Validate addresses
  if (!ethers.utils.isAddress(TALENT_PLUS_SUBSCRIPTION_ADDRESS)) {
    throw new Error(`❌ Invalid TALENT_PLUS_SUBSCRIPTION_ADDRESS: ${TALENT_PLUS_SUBSCRIPTION_ADDRESS}`);
  }

  if (!ethers.utils.isAddress(TRUSTED_SIGNER_ADDRESS)) {
    throw new Error(`❌ Invalid TRUSTED_SIGNER_ADDRESS: ${TRUSTED_SIGNER_ADDRESS}`);
  }

  const [admin] = await ethers.getSigners();
  console.log(`👤 Admin: ${admin.address}`);

  // Connect to the TalentPlusSubscription contract
  console.log(`🔗 Connecting to TalentPlusSubscription contract at: ${TALENT_PLUS_SUBSCRIPTION_ADDRESS}`);
  const talentPlusSubscription = await ethers.getContractAt(
    "TalentPlusSubscription",
    TALENT_PLUS_SUBSCRIPTION_ADDRESS
  ) as TalentPlusSubscription;

  // Verify admin is the owner or a trusted signer
  const owner = await talentPlusSubscription.owner();
  const isTrustedSigner = await talentPlusSubscription.isTrustedSigner(admin.address);
  
  if (owner.toLowerCase() !== admin.address.toLowerCase() && !isTrustedSigner) {
    throw new Error(`❌ Admin ${admin.address} is not the owner or a trusted signer. Owner is: ${owner}`);
  }

  // Check if the signer is already trusted
  console.log(`🔍 Checking if signer is already trusted: ${TRUSTED_SIGNER_ADDRESS}`);
  const isAlreadyTrusted = await talentPlusSubscription.isTrustedSigner(TRUSTED_SIGNER_ADDRESS);
  
  if (isAlreadyTrusted) {
    console.log("⚠️  The signer is already a trusted signer. No action needed.");
    return;
  }

  // Verify the signer address is a contract (optional check)
  try {
    const code = await ethers.provider.getCode(TRUSTED_SIGNER_ADDRESS);
    if (code !== "0x") {
      console.log("ℹ️  Signer address is a contract");
    } else {
      console.log("ℹ️  Signer address is an EOA (Externally Owned Account)");
    }
  } catch (error) {
    console.log("⚠️  Could not verify if signer is a contract, proceeding anyway");
  }

  // Summary
  console.log("\n📝 Add Trusted Signer Summary:");
  console.log("=" .repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`TalentPlusSubscription Contract: ${TALENT_PLUS_SUBSCRIPTION_ADDRESS}`);
  console.log(`Trusted Signer to Add: ${TRUSTED_SIGNER_ADDRESS}`);
  console.log(`Admin: ${admin.address}`);
  console.log("=" .repeat(60));

  // Estimate gas for the transaction
  console.log("\n⛽ Estimating gas...");
  try {
    const gasEstimate = await talentPlusSubscription.estimateGas.addTrustedSigner(TRUSTED_SIGNER_ADDRESS);
    console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);
  } catch (error) {
    console.error("❌ Gas estimation failed:", error);
    throw error;
  }

  // Execute the transaction
  console.log("\n🚀 Adding trusted signer...");
  let tx, receipt;
  try {
    tx = await talentPlusSubscription.addTrustedSigner(TRUSTED_SIGNER_ADDRESS);
    console.log(`📤 Transaction submitted: ${tx.hash}`);
    
    console.log("⏳ Waiting for confirmation...");
    receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Add trusted signer transaction failed:", errorMessage);
    throw error;
  }

  // Verify the addition
  console.log("\n🔍 Verifying the addition...");
  const isNowTrusted = await talentPlusSubscription.isTrustedSigner(TRUSTED_SIGNER_ADDRESS);
  
  if (isNowTrusted) {
    console.log("✅ Trusted signer added successfully!");
  } else {
    throw new Error("❌ Verification failed. Signer was not added as trusted.");
  }

  // Final summary
  console.log("\n🎉 Trusted Signer Addition Summary:");
  console.log("=" .repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`TalentPlusSubscription Contract: ${TALENT_PLUS_SUBSCRIPTION_ADDRESS}`);
  console.log(`Trusted Signer Added: ${TRUSTED_SIGNER_ADDRESS}`);
  console.log(`Transaction Hash: ${tx.hash}`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log("=" .repeat(60));

  console.log("\n📝 Next Steps:");
  console.log("1. Verify the update on block explorer");
  console.log("2. Test that the trusted signer can now add user subscriptions");
  console.log("3. Update any documentation with the new trusted signer address");

  console.log("\n✅ Trusted signer addition completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Add trusted signer failed:", error);
    process.exit(1);
  });

