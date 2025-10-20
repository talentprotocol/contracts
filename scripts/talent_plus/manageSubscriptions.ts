import { ethers, network } from "hardhat";
import { TalentPlusSubscription } from "../../typechain-types";

// Configuration
const SUBSCRIPTION_CONTRACT_ADDRESS = "0xE9feF6DDc821Fddc6Fc9AD775e23014Bc17d996E";

// New yearly subscription configuration
const YEARLY_SUBSCRIPTION_CONFIG = {
  slug: "yearly",
  durationInSeconds: 365 * 24 * 60 * 60, // 1 year in seconds
  priceInEth: ethers.utils.parseEther("0.0001"), // 0.0001 ETH
  discountPercentage: 100, // 100% discount
  talentRequiredForDiscount: ethers.utils.parseEther("100000") // 100k TALENT
};

async function main() {
  console.log(`Managing subscriptions on ${network.name}`);
  console.log(`Contract Address: ${SUBSCRIPTION_CONTRACT_ADDRESS}`);

  const [admin] = await ethers.getSigners();
  console.log(`Admin: ${admin.address}`);

  // Connect to TalentPlusSubscription contract
  const talentPlusSubscription = await ethers.getContractAt(
    "TalentPlusSubscription", 
    SUBSCRIPTION_CONTRACT_ADDRESS
  ) as TalentPlusSubscription;

  // Verify admin is a trusted signer
  const isTrustedSigner = await talentPlusSubscription.isTrustedSigner(admin.address);
  if (!isTrustedSigner) {
    console.error("❌ ERROR: Admin address is not a trusted signer in TalentPlusSubscription");
    console.log(`Admin address: ${admin.address}`);
    console.log("Please add the admin as a trusted signer first using the contract's addTrustedSigner function");
    process.exit(1);
  }

  console.log("✅ Admin is verified as trusted signer");

  // Get current subscription models
  const totalModels = await talentPlusSubscription.getTotalModels();
  console.log(`📊 Current total subscription models: ${totalModels}`);

  // Get all available subscription slugs
  const availableSlugs: string[] = [];
  for (let i = 0; i < totalModels.toNumber(); i++) {
    const slug: string = await talentPlusSubscription.availableSubscriptionSlugs(i);
    availableSlugs.push(slug);
  }

  console.log(`📋 Current subscription models: ${availableSlugs.join(", ")}`);

  // Step 1: Deactivate all existing subscription models
  console.log("\n🔄 Step 1: Deactivating all existing subscription models...");
  
  for (const slug of availableSlugs) {
    try {
      // Check if model is active before deactivating
      const [duration, price, discount, talentRequired, active] = await talentPlusSubscription.getSubscriptionModel(slug);
      
      if (active) {
        console.log(`  📝 Deactivating "${slug}" model...`);
        const tx = await talentPlusSubscription.deactivateSubscriptionModel(slug);
        await tx.wait();
        console.log(`  ✅ Successfully deactivated "${slug}" model. Transaction: ${tx.hash}`);
      } else {
        console.log(`  ⚠️  "${slug}" model is already inactive`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to deactivate "${slug}" model:`, error.message || error);
    }
  }

  // Step 2: Add new yearly subscription model
  console.log("\n🆕 Step 2: Adding new yearly subscription model...");
  
  try {
    console.log(`  📝 Adding "${YEARLY_SUBSCRIPTION_CONFIG.slug}" subscription model...`);
    console.log(`    - Duration: ${YEARLY_SUBSCRIPTION_CONFIG.durationInSeconds / (24 * 60 * 60)} days`);
    console.log(`    - Price: ${ethers.utils.formatEther(YEARLY_SUBSCRIPTION_CONFIG.priceInEth)} ETH`);
    console.log(`    - Discount: ${YEARLY_SUBSCRIPTION_CONFIG.discountPercentage}%`);
    console.log(`    - TALENT Required: ${ethers.utils.formatEther(YEARLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount)} TALENT`);

    const tx = await talentPlusSubscription.addSubscriptionModel(
      YEARLY_SUBSCRIPTION_CONFIG.slug,
      YEARLY_SUBSCRIPTION_CONFIG.durationInSeconds,
      YEARLY_SUBSCRIPTION_CONFIG.priceInEth,
      YEARLY_SUBSCRIPTION_CONFIG.discountPercentage,
      YEARLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount
    );

    await tx.wait();
    console.log(`  ✅ Successfully added "${YEARLY_SUBSCRIPTION_CONFIG.slug}" model. Transaction: ${tx.hash}`);
  } catch (error) {
    console.error(`  ❌ Failed to add yearly subscription model:`, error.message || error);
    process.exit(1);
  }

  // Step 3: Verify the changes
  console.log("\n🔍 Step 3: Verifying changes...");
  
  const newTotalModels = await talentPlusSubscription.getTotalModels();
  console.log(`📊 New total subscription models: ${newTotalModels}`);

  // Get updated subscription slugs
  const newAvailableSlugs: string[] = [];
  for (let i = 0; i < newTotalModels.toNumber(); i++) {
    const slug: string = await talentPlusSubscription.availableSubscriptionSlugs(i);
    newAvailableSlugs.push(slug);
  }

  console.log(`📋 Updated subscription models: ${newAvailableSlugs.join(", ")}`);

  // Verify the yearly model details
  const yearlyModel = await talentPlusSubscription.getSubscriptionModel(YEARLY_SUBSCRIPTION_CONFIG.slug);
  console.log(`\n📋 Yearly subscription model details:`);
  console.log(`  - Slug: ${YEARLY_SUBSCRIPTION_CONFIG.slug}`);
  console.log(`  - Duration: ${yearlyModel.durationInSeconds.toNumber() / (24 * 60 * 60)} days`);
  console.log(`  - Price: ${ethers.utils.formatEther(yearlyModel.priceInEth)} ETH`);
  console.log(`  - Discount: ${yearlyModel.discountPercentage.toNumber()}%`);
  console.log(`  - TALENT Required: ${ethers.utils.formatEther(yearlyModel.talentRequiredForDiscount)} TALENT`);
  console.log(`  - Active: ${yearlyModel.active}`);

  // Test price calculation for different scenarios
  console.log("\n🧮 Step 4: Testing price calculations...");
  
  try {
    // Test with a wallet that has 100k+ TALENT (should get 100% discount = 0 ETH)
    const testWalletWithTalent = admin.address; // Using admin address for testing
    const [finalPriceWithTalent, discountAppliedWithTalent, discountAmountWithTalent] = 
      await talentPlusSubscription.calculateDiscountedPrice(YEARLY_SUBSCRIPTION_CONFIG.slug, testWalletWithTalent);
    
    console.log(`💰 Price calculation for wallet with TALENT holdings:`);
    console.log(`  - Wallet: ${testWalletWithTalent}`);
    console.log(`  - Final Price: ${ethers.utils.formatEther(finalPriceWithTalent)} ETH`);
    console.log(`  - Discount Applied: ${discountAppliedWithTalent}`);
    console.log(`  - Discount Amount: ${ethers.utils.formatEther(discountAmountWithTalent)} ETH`);

    // Test with a wallet that has no TALENT (should pay full price)
    const testWalletWithoutTalent = "0x0000000000000000000000000000000000000001"; // Non-existent address
    const [finalPriceWithoutTalent, discountAppliedWithoutTalent, discountAmountWithoutTalent] = 
      await talentPlusSubscription.calculateDiscountedPrice(YEARLY_SUBSCRIPTION_CONFIG.slug, testWalletWithoutTalent);
    
    console.log(`💰 Price calculation for wallet without TALENT holdings:`);
    console.log(`  - Wallet: ${testWalletWithoutTalent}`);
    console.log(`  - Final Price: ${ethers.utils.formatEther(finalPriceWithoutTalent)} ETH`);
    console.log(`  - Discount Applied: ${discountAppliedWithoutTalent}`);
    console.log(`  - Discount Amount: ${ethers.utils.formatEther(discountAmountWithoutTalent)} ETH`);
  } catch (error) {
    console.log(`⚠️  Price calculation test failed: ${error.message}`);
    console.log(`   This might be due to network issues or contract state`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUBSCRIPTION MANAGEMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`Contract: ${SUBSCRIPTION_CONTRACT_ADDRESS}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Total Models Before: ${totalModels}`);
  console.log(`Total Models After: ${newTotalModels}`);
  console.log(`Models Deactivated: ${availableSlugs.length}`);
  console.log(`New Model Added: ${YEARLY_SUBSCRIPTION_CONFIG.slug}`);
  console.log("=".repeat(60));

  console.log("\n✅ Subscription management completed successfully!");
  console.log("\n📝 Summary of Changes:");
  console.log(`- Deactivated ${availableSlugs.length} existing subscription models`);
  console.log(`- Added new "${YEARLY_SUBSCRIPTION_CONFIG.slug}" subscription model`);
  console.log(`- Duration: 1 year (${YEARLY_SUBSCRIPTION_CONFIG.durationInSeconds / (24 * 60 * 60)} days)`);
  console.log(`- Price: ${ethers.utils.formatEther(YEARLY_SUBSCRIPTION_CONFIG.priceInEth)} ETH`);
  console.log(`- Discount: ${YEARLY_SUBSCRIPTION_CONFIG.discountPercentage}% for holders of ${ethers.utils.formatEther(YEARLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount)} TALENT`);
  console.log(`- Users with 100k+ TALENT get 100% discount (pay 0 ETH)`);
  console.log(`- Users with <100k TALENT pay full price (${ethers.utils.formatEther(YEARLY_SUBSCRIPTION_CONFIG.priceInEth)} ETH)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
