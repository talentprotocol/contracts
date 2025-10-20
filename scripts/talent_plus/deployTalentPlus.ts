import { ethers, network } from "hardhat";
import { deployTalentPlus, deployTalentPlusSubscription } from "../shared";

// Network-specific addresses
const TALENT_TOKEN_ADDRESS_MAINNET = "0x9a33406165f562E16C3abD82fd1185482E01b49a";
const TALENT_TOKEN_ADDRESS_TESTNET = "0x9a33406165f562E16C3abD82fd1185482E01b49a"; // Same for now

const VAULT_ADDRESS_MAINNET = "0x23Ff3256A29847d7EF760943bd6679b565CbdE5a";
const VAULT_ADDRESS_TESTNET = "0x23Ff3256A29847d7EF760943bd6679b565CbdE5a"; // Same for now

const FEE_RECEIVER_MAINNET = "0x482C953A96769b6d0A1dE5777f7405A55F5DaEC0";
const FEE_RECEIVER_TESTNET = "0x482C953A96769b6d0A1dE5777f7405A55F5DaEC0";

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

  console.log("Configuration:");
  console.log(`- TALENT Token: ${talentTokenAddress}`);
  console.log(`- Vault Address: ${vaultAddress}`);
  console.log(`- Fee Receiver: ${feeReceiver}`);

  // Step 1: Deploy TalentPlusSubscription
  console.log("\n📦 Deploying TalentPlusSubscription...");
  const talentPlusSubscription = await deployTalentPlusSubscription(admin.address, talentTokenAddress, vaultAddress);
  console.log(`✅ TalentPlusSubscription deployed at: ${talentPlusSubscription.address}`);

  // Step 2: Deploy TalentPlus
  // console.log("\n📦 Deploying TalentPlus...");
  // const talentPlus = await deployTalentPlus(
  //   talentPlusSubscription.address,
  //   feeReceiver
  // );
  // console.log(`✅ TalentPlus deployed at: ${talentPlus.address}`);

  // Step 3: Setup trusted signers
  console.log("\n🔐 Setting up trusted signers...");
  
  // Add TalentPlus as trusted signer in TalentPlusSubscription
  console.log("Adding TalentPlus as trusted signer in TalentPlusSubscription...");
  await talentPlusSubscription.addTrustedSigner("0xC693F5692A543DEC564f21c2Afa6a5f98f250ae4");
  console.log("✅ TalentPlus added as trusted signer in TalentPlusSubscription");

  // Step 4: Add yearly subscription model
  console.log("\n📋 Adding yearly subscription model...");
  
  // Yearly subscription configuration
  const YEARLY_SUBSCRIPTION_CONFIG = {
    slug: "yearly",
    durationInSeconds: 365 * 24 * 60 * 60, // 1 year in seconds
    priceInEth: ethers.utils.parseEther("0.0001"), // 0.0001 ETH
    discountPercentage: 100, // 100% discount
    talentRequiredForDiscount: ethers.utils.parseEther("100000") // 100k TALENT
  };

  await talentPlusSubscription.addSubscriptionModel(
    YEARLY_SUBSCRIPTION_CONFIG.slug,
    YEARLY_SUBSCRIPTION_CONFIG.durationInSeconds,
    YEARLY_SUBSCRIPTION_CONFIG.priceInEth,
    YEARLY_SUBSCRIPTION_CONFIG.discountPercentage,
    YEARLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount
  );
  console.log("✅ Added 'yearly' subscription model (1 year, 0.0001 ETH, 100% discount for 100k TALENT)");

  // Step 5: Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  const totalModels = await talentPlusSubscription.getTotalModels();
  console.log(`✅ Total subscription models: ${totalModels}`);
  
  // const isTalentPlusTrusted = await talentPlusSubscription.isTrustedSigner(talentPlus.address);
  // console.log(`✅ TalentPlus is trusted signer in TalentPlusSubscription: ${isTalentPlusTrusted}`);

  // Step 6: Summary
  console.log("\n🎉 Deployment Summary:");
  console.log("=" .repeat(50));
  console.log(`Network: ${network.name}`);
  console.log(`TalentPlusSubscription: ${talentPlusSubscription.address}`);
  // console.log(`TalentPlus: ${talentPlus.address}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Fee Receiver: ${feeReceiver}`);
  console.log(`TALENT Token: ${talentTokenAddress}`);
  console.log(`Vault Address: ${vaultAddress}`);
  console.log(`Total Models: ${totalModels}`);
  console.log("=" .repeat(50));

  console.log("\n📝 Next Steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Update frontend with new contract addresses");
  console.log("3. Test subscription functionality with the yearly model");
  console.log("4. Consider transferring ownership to a multisig if needed");

  console.log("\n🔍 Contract Verification Commands:");
  console.log("=" .repeat(80));
  console.log(`# Verify TalentPlusSubscription:`);
  console.log(`npx hardhat verify --network ${network.name} ${talentPlusSubscription.address} ${admin.address} ${talentTokenAddress} ${vaultAddress}`);
  console.log("");
  console.log(`# Verify TalentPlus:`);
  // console.log(`npx hardhat verify --network ${network.name} ${talentPlus.address} ${talentPlusSubscription.address} ${feeReceiver}`);
  console.log("=" .repeat(80));

  console.log("\n✅ Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
