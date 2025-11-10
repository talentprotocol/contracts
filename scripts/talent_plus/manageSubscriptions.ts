import { ethers, network } from "hardhat";
import { TalentPlusSubscription } from "../../typechain-types";

// Configuration
const SUBSCRIPTION_CONTRACT_ADDRESS = "0xD10cdad7FC037cDd54618F26Df65b718795e8430";

// Subscription model configurations
const MONTHLY_SUBSCRIPTION_CONFIG = {
  slug: "monthly",
  durationInSeconds: 30 * 24 * 60 * 60, // 30 days in seconds
  price: ethers.utils.parseUnits("9.99", 6), // 9.99 USDC (6 decimals)
  discountPercentage: 100, // 100% discount
  talentRequiredForDiscount: ethers.utils.parseEther("100000") // 100k TALENT
};

const YEARLY_SUBSCRIPTION_CONFIG = {
  slug: "yearly",
  durationInSeconds: 365 * 24 * 60 * 60, // 1 year in seconds
  price: ethers.utils.parseUnits("99.99", 6), // 99.99 USDC (6 decimals)
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

  // Step 1: Update monthly subscription model
  console.log("\n🔄 Step 1: Updating monthly subscription model...");
  
  try {
    // Check if monthly model exists
    const monthlyModel = await talentPlusSubscription.getSubscriptionModel(MONTHLY_SUBSCRIPTION_CONFIG.slug);
    
    if (!monthlyModel.active) {
      console.error(`  ❌ Monthly subscription model "${MONTHLY_SUBSCRIPTION_CONFIG.slug}" is not active`);
      process.exit(1);
    }

    console.log(`  📝 Updating "${MONTHLY_SUBSCRIPTION_CONFIG.slug}" subscription model...`);
    console.log(`    - Duration: ${MONTHLY_SUBSCRIPTION_CONFIG.durationInSeconds / (24 * 60 * 60)} days`);
    console.log(`    - New Price: ${ethers.utils.formatUnits(MONTHLY_SUBSCRIPTION_CONFIG.price, 6)} USDC`);
    console.log(`    - Discount: ${MONTHLY_SUBSCRIPTION_CONFIG.discountPercentage}%`);
    console.log(`    - TALENT Required: ${ethers.utils.formatEther(MONTHLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount)} TALENT`);

    const monthlyTx = await talentPlusSubscription.updateSubscriptionModel(
      MONTHLY_SUBSCRIPTION_CONFIG.slug,
      MONTHLY_SUBSCRIPTION_CONFIG.durationInSeconds,
      MONTHLY_SUBSCRIPTION_CONFIG.price,
      MONTHLY_SUBSCRIPTION_CONFIG.discountPercentage,
      MONTHLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount
    );

    await monthlyTx.wait();
    console.log(`  ✅ Successfully updated "${MONTHLY_SUBSCRIPTION_CONFIG.slug}" model. Transaction: ${monthlyTx.hash}`);
  } catch (error) {
    console.error(`  ❌ Failed to update monthly subscription model:`, error.message || error);
    process.exit(1);
  }

  // Step 2: Update yearly subscription model
  console.log("\n🔄 Step 2: Updating yearly subscription model...");
  
  try {
    // Check if yearly model exists
    const yearlyModel = await talentPlusSubscription.getSubscriptionModel(YEARLY_SUBSCRIPTION_CONFIG.slug);
    
    if (!yearlyModel.active) {
      console.error(`  ❌ Yearly subscription model "${YEARLY_SUBSCRIPTION_CONFIG.slug}" is not active`);
      process.exit(1);
    }

    console.log(`  📝 Updating "${YEARLY_SUBSCRIPTION_CONFIG.slug}" subscription model...`);
    console.log(`    - Duration: ${YEARLY_SUBSCRIPTION_CONFIG.durationInSeconds / (24 * 60 * 60)} days`);
    console.log(`    - New Price: ${ethers.utils.formatUnits(YEARLY_SUBSCRIPTION_CONFIG.price, 6)} USDC`);
    console.log(`    - Discount: ${YEARLY_SUBSCRIPTION_CONFIG.discountPercentage}%`);
    console.log(`    - TALENT Required: ${ethers.utils.formatEther(YEARLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount)} TALENT`);

    const yearlyTx = await talentPlusSubscription.updateSubscriptionModel(
      YEARLY_SUBSCRIPTION_CONFIG.slug,
      YEARLY_SUBSCRIPTION_CONFIG.durationInSeconds,
      YEARLY_SUBSCRIPTION_CONFIG.price,
      YEARLY_SUBSCRIPTION_CONFIG.discountPercentage,
      YEARLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount
    );

    await yearlyTx.wait();
    console.log(`  ✅ Successfully updated "${YEARLY_SUBSCRIPTION_CONFIG.slug}" model. Transaction: ${yearlyTx.hash}`);
  } catch (error) {
    console.error(`  ❌ Failed to update yearly subscription model:`, error.message || error);
    process.exit(1);
  }

  // Step 3: Verify the changes
  console.log("\n🔍 Step 3: Verifying changes...");
  
  // Verify the monthly model details
  const updatedMonthlyModel = await talentPlusSubscription.getSubscriptionModel(MONTHLY_SUBSCRIPTION_CONFIG.slug);
  console.log(`\n📋 Monthly subscription model details:`);
  console.log(`  - Slug: ${MONTHLY_SUBSCRIPTION_CONFIG.slug}`);
  console.log(`  - Duration: ${updatedMonthlyModel.durationInSeconds.toNumber() / (24 * 60 * 60)} days`);
  console.log(`  - Price: ${ethers.utils.formatUnits(updatedMonthlyModel.price, 6)} USDC`);
  console.log(`  - Discount: ${updatedMonthlyModel.discountPercentage.toNumber()}%`);
  console.log(`  - TALENT Required: ${ethers.utils.formatEther(updatedMonthlyModel.talentRequiredForDiscount)} TALENT`);
  console.log(`  - Active: ${updatedMonthlyModel.active}`);

  // Verify the yearly model details
  const updatedYearlyModel = await talentPlusSubscription.getSubscriptionModel(YEARLY_SUBSCRIPTION_CONFIG.slug);
  console.log(`\n📋 Yearly subscription model details:`);
  console.log(`  - Slug: ${YEARLY_SUBSCRIPTION_CONFIG.slug}`);
  console.log(`  - Duration: ${updatedYearlyModel.durationInSeconds.toNumber() / (24 * 60 * 60)} days`);
  console.log(`  - Price: ${ethers.utils.formatUnits(updatedYearlyModel.price, 6)} USDC`);
  console.log(`  - Discount: ${updatedYearlyModel.discountPercentage.toNumber()}%`);
  console.log(`  - TALENT Required: ${ethers.utils.formatEther(updatedYearlyModel.talentRequiredForDiscount)} TALENT`);
  console.log(`  - Active: ${updatedYearlyModel.active}`);

  // Test price calculation for different scenarios
  console.log("\n🧮 Step 4: Testing price calculations...");
  
  try {
    // Test monthly with a wallet that has 100k+ TALENT (should get 100% discount = 0 USDC)
    const testWalletWithTalent = admin.address; // Using admin address for testing
    const [monthlyPriceWithTalent, monthlyDiscountApplied, monthlyDiscountAmount] = 
      await talentPlusSubscription.calculateDiscountedPrice(MONTHLY_SUBSCRIPTION_CONFIG.slug, testWalletWithTalent);
    
    console.log(`💰 Monthly price calculation for wallet with TALENT holdings:`);
    console.log(`  - Wallet: ${testWalletWithTalent}`);
    console.log(`  - Final Price: ${ethers.utils.formatUnits(monthlyPriceWithTalent, 6)} USDC`);
    console.log(`  - Discount Applied: ${monthlyDiscountApplied}`);
    console.log(`  - Discount Amount: ${ethers.utils.formatUnits(monthlyDiscountAmount, 6)} USDC`);

    // Test yearly with a wallet that has 100k+ TALENT (should get 100% discount = 0 USDC)
    const [yearlyPriceWithTalent, yearlyDiscountApplied, yearlyDiscountAmount] = 
      await talentPlusSubscription.calculateDiscountedPrice(YEARLY_SUBSCRIPTION_CONFIG.slug, testWalletWithTalent);
    
    console.log(`💰 Yearly price calculation for wallet with TALENT holdings:`);
    console.log(`  - Wallet: ${testWalletWithTalent}`);
    console.log(`  - Final Price: ${ethers.utils.formatUnits(yearlyPriceWithTalent, 6)} USDC`);
    console.log(`  - Discount Applied: ${yearlyDiscountApplied}`);
    console.log(`  - Discount Amount: ${ethers.utils.formatUnits(yearlyDiscountAmount, 6)} USDC`);

    // Test with a wallet that has no TALENT (should pay full price)
    const testWalletWithoutTalent = "0x0000000000000000000000000000000000000001"; // Non-existent address
    const [monthlyPriceWithoutTalent, monthlyDiscountAppliedWithout, monthlyDiscountAmountWithout] = 
      await talentPlusSubscription.calculateDiscountedPrice(MONTHLY_SUBSCRIPTION_CONFIG.slug, testWalletWithoutTalent);
    
    console.log(`💰 Monthly price calculation for wallet without TALENT holdings:`);
    console.log(`  - Wallet: ${testWalletWithoutTalent}`);
    console.log(`  - Final Price: ${ethers.utils.formatUnits(monthlyPriceWithoutTalent, 6)} USDC`);
    console.log(`  - Discount Applied: ${monthlyDiscountAppliedWithout}`);
    console.log(`  - Discount Amount: ${ethers.utils.formatUnits(monthlyDiscountAmountWithout, 6)} USDC`);

    const [yearlyPriceWithoutTalent, yearlyDiscountAppliedWithout, yearlyDiscountAmountWithout] = 
      await talentPlusSubscription.calculateDiscountedPrice(YEARLY_SUBSCRIPTION_CONFIG.slug, testWalletWithoutTalent);
    
    console.log(`💰 Yearly price calculation for wallet without TALENT holdings:`);
    console.log(`  - Wallet: ${testWalletWithoutTalent}`);
    console.log(`  - Final Price: ${ethers.utils.formatUnits(yearlyPriceWithoutTalent, 6)} USDC`);
    console.log(`  - Discount Applied: ${yearlyDiscountAppliedWithout}`);
    console.log(`  - Discount Amount: ${ethers.utils.formatUnits(yearlyDiscountAmountWithout, 6)} USDC`);
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
  console.log(`Total Models: ${totalModels}`);
  console.log("=".repeat(60));

  console.log("\n✅ Subscription management completed successfully!");
  console.log("\n📝 Summary of Changes:");
  console.log(`- Updated "${MONTHLY_SUBSCRIPTION_CONFIG.slug}" subscription model`);
  console.log(`  - Duration: 30 days`);
  console.log(`  - New Price: ${ethers.utils.formatUnits(MONTHLY_SUBSCRIPTION_CONFIG.price, 6)} USDC`);
  console.log(`  - Discount: ${MONTHLY_SUBSCRIPTION_CONFIG.discountPercentage}% for holders of ${ethers.utils.formatEther(MONTHLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount)} TALENT`);
  console.log(`  - Users with 100k+ TALENT get 100% discount (pay 0 USDC)`);
  console.log(`  - Users with <100k TALENT pay full price (${ethers.utils.formatUnits(MONTHLY_SUBSCRIPTION_CONFIG.price, 6)} USDC)`);
  console.log(`\n- Updated "${YEARLY_SUBSCRIPTION_CONFIG.slug}" subscription model`);
  console.log(`  - Duration: 1 year (${YEARLY_SUBSCRIPTION_CONFIG.durationInSeconds / (24 * 60 * 60)} days)`);
  console.log(`  - New Price: ${ethers.utils.formatUnits(YEARLY_SUBSCRIPTION_CONFIG.price, 6)} USDC`);
  console.log(`  - Discount: ${YEARLY_SUBSCRIPTION_CONFIG.discountPercentage}% for holders of ${ethers.utils.formatEther(YEARLY_SUBSCRIPTION_CONFIG.talentRequiredForDiscount)} TALENT`);
  console.log(`  - Users with 100k+ TALENT get 100% discount (pay 0 USDC)`);
  console.log(`  - Users with <100k TALENT pay full price (${ethers.utils.formatUnits(YEARLY_SUBSCRIPTION_CONFIG.price, 6)} USDC)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
