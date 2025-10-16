import { ethers, network } from "hardhat";
import { deployTalentPlus, deployTalentPlusSubscription } from "../shared";

// Network-specific addresses
const TALENT_TOKEN_ADDRESS_MAINNET = "0x9a33406165f562E16C3abD82fd1185482E01b49a";
const TALENT_TOKEN_ADDRESS_TESTNET = "0x9a33406165f562E16C3abD82fd1185482E01b49a"; // Same for now

const FEE_RECEIVER_MAINNET = "0xC925bD0E839E8e22A7DDEbe7f4C21b187deeC358";
const FEE_RECEIVER_TESTNET = "0x08BC8a92e5C99755C675A21BC4FcfFb59E0A9508";

// Trusted signer address (this should be set to the actual trusted signer address)
const TRUSTED_SIGNER_MAINNET = "0x0000000000000000000000000000000000000000"; // TODO: Set actual trusted signer
const TRUSTED_SIGNER_TESTNET = "0x0000000000000000000000000000000000000000"; // TODO: Set actual trusted signer

async function main() {
  console.log(`Deploying TalentPlus contracts on ${network.name}`);

  const [admin] = await ethers.getSigners();
  console.log(`Admin will be ${admin.address}`);

  // Get network-specific addresses
  const talentTokenAddress = network.name === "mainnet"
    ? TALENT_TOKEN_ADDRESS_MAINNET
    : TALENT_TOKEN_ADDRESS_TESTNET;
  
  const feeReceiver = network.name === "mainnet"
    ? FEE_RECEIVER_MAINNET
    : FEE_RECEIVER_TESTNET;
  
  const trustedSigner = network.name === "mainnet"
    ? TRUSTED_SIGNER_MAINNET
    : TRUSTED_SIGNER_TESTNET;

  console.log("Configuration:");
  console.log(`- TALENT Token: ${talentTokenAddress}`);
  console.log(`- Fee Receiver: ${feeReceiver}`);
  console.log(`- Trusted Signer: ${trustedSigner}`);

  // Validate trusted signer address
  if (trustedSigner === "0x0000000000000000000000000000000000000000") {
    console.error("❌ ERROR: Trusted signer address not set! Please update TRUSTED_SIGNER_MAINNET/TESTNET");
    process.exit(1);
  }

  // Step 1: Deploy TalentPlusSubscription
  console.log("\n📦 Deploying TalentPlusSubscription...");
  const talentPlusSubscription = await deployTalentPlusSubscription(admin.address);
  console.log(`✅ TalentPlusSubscription deployed at: ${talentPlusSubscription.address}`);

  // Step 2: Deploy TalentPlus
  console.log("\n📦 Deploying TalentPlus...");
  const talentPlus = await deployTalentPlus(
    trustedSigner,
    talentPlusSubscription.address,
    feeReceiver,
    talentTokenAddress
  );
  console.log(`✅ TalentPlus deployed at: ${talentPlus.address}`);

  // Step 3: Setup trusted signers
  console.log("\n🔐 Setting up trusted signers...");
  
  // Add TalentPlus as trusted signer in TalentPlusSubscription
  console.log("Adding TalentPlus as trusted signer in TalentPlusSubscription...");
  await talentPlusSubscription.addTrustedSigner(talentPlus.address);
  console.log("✅ TalentPlus added as trusted signer in TalentPlusSubscription");

  // Step 4: Add initial subscription models
  console.log("\n📋 Adding initial subscription models...");
  
  // Basic subscription: 30 days, 50 TALENT
  await talentPlusSubscription.addSubscriptionModel(
    "basic",
    30 * 24 * 60 * 60, // 30 days in seconds
    ethers.utils.parseEther("50")
  );
  console.log("✅ Added 'basic' subscription model (30 days, 50 TALENT)");

  // Premium subscription: 90 days, 100 TALENT
  await talentPlusSubscription.addSubscriptionModel(
    "premium",
    90 * 24 * 60 * 60, // 90 days in seconds
    ethers.utils.parseEther("100")
  );
  console.log("✅ Added 'premium' subscription model (90 days, 100 TALENT)");

  // Pro subscription: 180 days, 150 TALENT
  await talentPlusSubscription.addSubscriptionModel(
    "pro",
    180 * 24 * 60 * 60, // 180 days in seconds
    ethers.utils.parseEther("150")
  );
  console.log("✅ Added 'pro' subscription model (180 days, 150 TALENT)");

  // Step 5: Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  const totalModels = await talentPlusSubscription.getTotalModels();
  console.log(`✅ Total subscription models: ${totalModels}`);
  
  const isTalentPlusTrusted = await talentPlusSubscription.isTrustedSigner(talentPlus.address);
  console.log(`✅ TalentPlus is trusted signer in TalentPlusSubscription: ${isTalentPlusTrusted}`);

  // Step 6: Summary
  console.log("\n🎉 Deployment Summary:");
  console.log("=" .repeat(50));
  console.log(`Network: ${network.name}`);
  console.log(`TalentPlusSubscription: ${talentPlusSubscription.address}`);
  console.log(`TalentPlus: ${talentPlus.address}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Trusted Signer: ${trustedSigner}`);
  console.log(`Fee Receiver: ${feeReceiver}`);
  console.log(`TALENT Token: ${talentTokenAddress}`);
  console.log(`Total Models: ${totalModels}`);
  console.log("=" .repeat(50));

  console.log("\n📝 Next Steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Update frontend with new contract addresses");
  console.log("3. Test subscription functionality");
  console.log("4. Consider transferring ownership to a multisig if needed");

  console.log("\n✅ Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
