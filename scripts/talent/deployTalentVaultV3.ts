import { ethers, network, run } from "hardhat";
import { deployTalentVaultV3 } from "../shared";

const TALENT_TOKEN_MAINNET = "0x9a33406165f562E16C3abD82fd1185482E01b49a";
const TALENT_TOKEN_TESTNET = "0x7c2a63e1713578d4d704b462C2dee311A59aE304";

const YIELD_SOURCE_MAINNET = "0x34118871f5943D6B153381C0133115c3B5b78b12";
const YIELD_SOURCE_TESTNET = "0x33041027dd8F4dC82B6e825FB37ADf8f15d44053";

async function main() {
  console.log("=".repeat(60));
  console.log(`Deploying Talent Vault V3 to network: ${network.name}`);
  console.log("=".repeat(60));

  const [admin] = await ethers.getSigners();
  console.log(`\nDeployer address: ${admin.address}`);

  // Select addresses based on network
  let talentToken: string;
  let yieldSource: string;

  if (network.name === "base") {
    console.log("Network: Base Mainnet");
    talentToken = TALENT_TOKEN_MAINNET;
    yieldSource = YIELD_SOURCE_MAINNET;
  } else if (network.name === "baseSepolia") {
    console.log("Network: Base Sepolia Testnet");
    talentToken = TALENT_TOKEN_TESTNET;
    yieldSource = YIELD_SOURCE_TESTNET;
  } else if (network.name === "hardhat" || network.name === "localhost") {
    console.log("Network: Local Development");
    console.log("⚠️  WARNING: Using mainnet addresses for local testing");
    talentToken = TALENT_TOKEN_MAINNET;
    yieldSource = YIELD_SOURCE_MAINNET;
  } else {
    throw new Error(`❌ Unsupported network: ${network.name}. Supported networks: base, baseSepolia`);
  }

  console.log(`\nUsing Talent Token: ${talentToken}`);
  console.log(`Using Yield Source: ${yieldSource}`);

  // Validate addresses are actual contracts (skip for local networks)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log(`\nValidating contract addresses...`);

    const tokenCode = await ethers.provider.getCode(talentToken);
    if (tokenCode === "0x") {
      throw new Error(`❌ Talent Token address ${talentToken} is not a contract on ${network.name}`);
    }
    console.log(`✅ Talent Token verified at ${talentToken}`);

    const yieldSourceCode = await ethers.provider.getCode(yieldSource);
    if (yieldSourceCode === "0x") {
      throw new Error(`❌ Yield Source address ${yieldSource} is not a contract on ${network.name}`);
    }
    console.log(`✅ Yield Source verified at ${yieldSource}`);
  }

  console.log(`\nDeploying TalentVaultV3...`);
  const talentVaultV3 = await deployTalentVaultV3(
    talentToken,
    yieldSource
  );

  console.log(`\n✅ Talent Vault V3 deployed successfully!`);
  console.log(`Contract address: ${talentVaultV3.address}`);

  // Post-deployment verification
  console.log(`\nVerifying deployment configuration...`);
  const deployedYieldSource = await talentVaultV3.yieldSource();
  const deployedToken = await talentVaultV3.token();
  const deployedOwner = await talentVaultV3.owner();
  const deployedYieldRate = await talentVaultV3.yieldRate();
  const deployedLockPeriod = await talentVaultV3.lockPeriod();
  const deployedMaxDeposit = await talentVaultV3.maxOverallDeposit();
  const deployedYieldAccrualDeadline = await talentVaultV3.yieldAccrualDeadline();

  if (deployedYieldSource.toLowerCase() !== yieldSource.toLowerCase()) {
    throw new Error(`❌ Yield source mismatch! Expected ${yieldSource}, got ${deployedYieldSource}`);
  }
  if (deployedToken.toLowerCase() !== talentToken.toLowerCase()) {
    throw new Error(`❌ Token mismatch! Expected ${talentToken}, got ${deployedToken}`);
  }
  if (deployedOwner.toLowerCase() !== admin.address.toLowerCase()) {
    throw new Error(`❌ Owner mismatch! Expected ${admin.address}, got ${deployedOwner}`);
  }

  console.log(`✅ Yield Source: ${deployedYieldSource}`);
  console.log(`✅ Token: ${deployedToken}`);
  console.log(`✅ Owner: ${deployedOwner}`);
  console.log(`✅ Yield Rate: ${deployedYieldRate.toString()} (${deployedYieldRate.toNumber() / 100}%)`);
  console.log(`✅ Lock Period: ${deployedLockPeriod.toString()} seconds (${deployedLockPeriod.toNumber() / 86400} days)`);
  console.log(`✅ Max Overall Deposit: ${ethers.utils.formatEther(deployedMaxDeposit)} TALENT`);

  const currentTime = Math.floor(Date.now() / 1000);
  const daysUntilDeadline = Math.floor((deployedYieldAccrualDeadline.toNumber() - currentTime) / 86400);
  console.log(`✅ Yield Accrual Deadline: ${new Date(deployedYieldAccrualDeadline.toNumber() * 1000).toISOString()} (${daysUntilDeadline} days from now)`);

  // Attempt automatic verification on block explorers
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Attempting contract verification on block explorer...`);
    console.log(`${"=".repeat(60)}`);

    try {
      await run("verify:verify", {
        address: talentVaultV3.address,
        constructorArguments: [talentToken, yieldSource],
      });
      console.log(`✅ Contract verified successfully on block explorer`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`ℹ️  Contract already verified on block explorer`);
      } else {
        console.log(`⚠️  Automatic verification failed:`, error.message);
        console.log(`\nManual verification parameters:`);
        console.log(`Contract address: ${talentVaultV3.address}`);
        console.log(`Constructor arguments: ["${talentToken}", "${yieldSource}"]`);
      }
    }
  }

  // Important post-deployment instructions
  console.log(`\n${"=".repeat(60)}`);
  console.log(`POST-DEPLOYMENT CHECKLIST`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\n⚠️  IMPORTANT: Complete these steps before users can deposit:\n`);
  console.log(`1. Ensure yield source wallet has sufficient TALENT tokens`);
  console.log(`   Yield Source Address: ${yieldSource}`);
  console.log(`   Recommended balance: At least ${ethers.utils.formatEther(ethers.utils.parseEther("100000"))} TALENT\n`);
  console.log(`2. Approve the vault to spend tokens from yield source:`);
  console.log(`   - Connect to yield source wallet`);
  console.log(`   - Call: TalentToken.approve("${talentVaultV3.address}", <amount>)`);
  console.log(`   - Recommended approval: ${ethers.utils.formatEther(ethers.utils.parseEther("100000"))} TALENT\n`);
  console.log(`3. Monitor yield accrual deadline (currently ${daysUntilDeadline} days)`);
  console.log(`   - Extend before expiry using: setYieldAccrualDeadline(newTimestamp)\n`);
  console.log(`4. Test deployment with a small deposit before announcing\n`);
  console.log(`5. Consider adjusting max overall deposit if needed:`);
  console.log(`   - Current: ${ethers.utils.formatEther(deployedMaxDeposit)} TALENT`);
  console.log(`   - Adjust with: setMaxOverallDeposit(newAmount)\n`);

  console.log(`${"=".repeat(60)}`);
  console.log(`✅ Deployment Complete!`);
  console.log(`${"=".repeat(60)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
