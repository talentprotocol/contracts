import { ethers, network } from "hardhat";
import { deployTalentPlus, deployTalentPlusSubscription } from "../shared";

// Network-specific addresses
const TALENT_TOKEN_ADDRESS_MAINNET = "0x9a33406165f562E16C3abD82fd1185482E01b49a";
const TALENT_TOKEN_ADDRESS_TESTNET = "0x9a33406165f562E16C3abD82fd1185482E01b49a"; // Same for now

const VAULT_ADDRESS_MAINNET = "0x23Ff3256A29847d7EF760943bd6679b565CbdE5a";
const VAULT_ADDRESS_TESTNET = "0x23Ff3256A29847d7EF760943bd6679b565CbdE5a"; // Same for now

const FEE_RECEIVER_MAINNET = "0x482C953A96769b6d0A1dE5777f7405A55F5DaEC0";
const FEE_RECEIVER_TESTNET = "0x482C953A96769b6d0A1dE5777f7405A55F5DaEC0";

// USDC token address (Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Trusted signer address (this should be set to the actual trusted signer address)
// REMOVED: No longer needed since anyone can call subscribe

async function main() {
  console.log(`Deploying TalentPlus contracts on ${network.name}`);

  const [admin] = await ethers.getSigners();
  console.log(`Admin will be ${admin.address}`);

  // Get network-specific addresses
  const talentTokenAddress = network.name === "mainnet"
    ? TALENT_TOKEN_ADDRESS_MAINNET
    : TALENT_TOKEN_ADDRESS_TESTNET;
  
  const vaultAddress = network.name === "mainnet"
    ? VAULT_ADDRESS_MAINNET
    : VAULT_ADDRESS_TESTNET;
  
  const feeReceiver = network.name === "mainnet"
    ? FEE_RECEIVER_MAINNET
    : FEE_RECEIVER_TESTNET;

  // Convert single vault address to array for compatibility
  const vaultAddresses = [vaultAddress];

  console.log("Configuration:");
  console.log(`- TALENT Token: ${talentTokenAddress}`);
  console.log(`- Vault Addresses: ${vaultAddresses.join(", ")}`);
  console.log(`- Fee Receiver: ${feeReceiver}`);

  // Step 1: Deploy TalentPlusSubscription
  console.log("\n📦 Deploying TalentPlusSubscription...");
  const talentPlusSubscription = await deployTalentPlusSubscription(admin.address, talentTokenAddress, vaultAddresses);
  console.log(`✅ TalentPlusSubscription deployed at: ${talentPlusSubscription.address}`);

  // Step 2: Deploy TalentPlus
  console.log("\n📦 Deploying TalentPlus...");
  const talentPlus = await deployTalentPlus(
    talentPlusSubscription.address,
    feeReceiver,
    USDC_ADDRESS
  );
  console.log(`✅ TalentPlus deployed at: ${talentPlus.address}`);
  console.log(`   Payment Token (USDC): ${USDC_ADDRESS}`);

  // Step 3: Setup trusted signers
  console.log("\n🔐 Setting up trusted signers...");
  
  // Add TalentPlus as trusted signer in TalentPlusSubscription
  console.log("Adding TalentPlus as trusted signer in TalentPlusSubscription...");
  await talentPlusSubscription.addTrustedSigner(talentPlus.address);
  console.log("✅ TalentPlus added as trusted signer in TalentPlusSubscription");

  // Step 4: Add subscription models
  console.log("\n📋 Adding subscription models...");
  
  // Yearly subscription configuration
  const YEARLY_SUBSCRIPTION_CONFIG = {
    slug: "yearly",
    durationInSeconds: 365 * 24 * 60 * 60, // 1 year in seconds
    price: ethers.utils.parseUnits("99.99", 6), // 99.99 USDC (6 decimals)
    discountPercentage: 100, // 100% discount
    talentRequiredForDiscount: ethers.utils.parseEther("100000") // 100k TALENT
  };

  await talentPlusSubscription.addSubscriptionModel(
    YEARLY_SUBSCRIPTION_CONFIG.slug,
    YEARLY_SUBSCRIPTION_CONFIG.durationInSeconds,
    YEARLY_SUBSCRIPTION_CONFIG.price,
    YEARLY_SUBSCRIPTION_CONFIG.discountPercentage,
    YEARLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount
  );
  console.log("✅ Added 'yearly' subscription model (1 year, 49.99 USDC, 100% discount for 100k TALENT)");

  // Monthly subscription configuration
  const MONTHLY_SUBSCRIPTION_CONFIG = {
    slug: "monthly",
    durationInSeconds: 30 * 24 * 60 * 60, // 30 days in seconds
    price: ethers.utils.parseUnits("9.99", 6), // 4.99 USDC (6 decimals)
    discountPercentage: 100, // 100% discount
    talentRequiredForDiscount: ethers.utils.parseEther("100000") // 100k TALENT
  };

  await talentPlusSubscription.addSubscriptionModel(
    MONTHLY_SUBSCRIPTION_CONFIG.slug,
    MONTHLY_SUBSCRIPTION_CONFIG.durationInSeconds,
    MONTHLY_SUBSCRIPTION_CONFIG.price,
    MONTHLY_SUBSCRIPTION_CONFIG.discountPercentage,
    MONTHLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount
  );
  console.log("✅ Added 'monthly' subscription model (30 days, 4.99 USDC, 100% discount for 100k TALENT)");

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
  console.log(`Fee Receiver: ${feeReceiver}`);
  console.log(`TALENT Token: ${talentTokenAddress}`);
  console.log(`Vault Addresses: ${vaultAddresses.join(", ")}`);
  console.log(`Total Models: ${totalModels}`);
  console.log("=" .repeat(50));

  console.log("\n📝 Next Steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Update frontend with new contract addresses");
  console.log("3. Test subscription functionality with yearly and monthly models");
  console.log("4. Consider transferring ownership to a multisig if needed");

  console.log("\n🔍 Contract Verification Commands:");
  console.log("=" .repeat(80));
  console.log(`# Verify TalentPlusSubscription (using custom task):`);
  console.log(`npx hardhat verify-talent-plus-subscription --network ${network.name} --address ${talentPlusSubscription.address} --owner ${admin.address} --token ${talentTokenAddress} --vaults ${vaultAddresses.join(",")}`);
  console.log("");
  console.log(`# Verify TalentPlus:`);
  console.log(`npx hardhat verify --network ${network.name} ${talentPlus.address} ${talentPlusSubscription.address} ${feeReceiver} ${USDC_ADDRESS}`);
  console.log("=" .repeat(80));

  console.log("\n✅ Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
