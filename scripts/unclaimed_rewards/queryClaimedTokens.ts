import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as TalentRewardClaimABI from "../../artifacts/contracts/talent/TalentRewardClaim.sol/TalentRewardClaim.json";
import walletsData from "./wallets.json";

const CONTRACT_ADDRESS = "0x484494700D7D2E9af70d63f0BAd6cb97CaAf575b";

// Admin wallets list
const ADMIN_WALLETS = [
  "0xe3b35ff40263385159f5705ece0223ea81730692",
  "0x324e9e13dd19528d0f390201923d17c4b7e94462",
  "0xa081e1da16133bb4ebc7aab1a9b0588a48d15138",
  "0x9f4a7723418be9bd2b7556f921a63cd7b727e65b",
  "0x03ae395d04d1de1a34f1bf6ef86ac53d9b35d41a",
  "0x363c6fc7ea65f8232bbccb1ba90bb0e4727422dc",
  "0xb90a80be548b60f2dac75b465f93003129b15ec8",
  "0xdbaa1d1f14febecd61516ebe9f5541907db6dc1a",
  "0x502aba4d4c507f294818ae1fc3ce25a1623dce22",
  "0x923b6bfc8cb0d9a57716a1340f7b86e8b678ecea",
  "0x6ac5755992f781674853e49c6846bebb89afcbc7",
  "0x3dbf55729abcf55f3b4f7cebfe88b7d59be3f23f",
].map(addr => addr.toLowerCase()); // Normalize to lowercase for comparison

interface WalletData {
  wallet: string;
  proof: string[] | null;
  amount?: string; // Amount from wallets.json (in wei/raw units)
  amountAllocated?: string; // Optional: if provided, will calculate claimable amount
}

interface ClaimData {
  wallet: string;
  tokensClaimed: string;
  lastClaimed: string;
  lastClaimedDate: string | null;
  isAdmin?: boolean; // Whether this wallet is an admin wallet
  amountAllocated?: string | null;
  claimable?: string | null; // amountAllocated - tokensClaimed
  total?: string; // Total allocation per wallet (same as amountAllocated if available)
  leftToClaim?: string | null; // Amount left to claim per wallet (same as claimable)
}

async function main() {
  console.log("Querying TalentRewardClaim contract...");
  console.log(`Contract Address: ${CONTRACT_ADDRESS}\n`);

  // Get a provider (read-only, no signer needed for view functions)
  const provider = ethers.provider;

  // Create contract instance
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    TalentRewardClaimABI.abi,
    provider
  );

  const wallets: WalletData[] = walletsData;
  const results: ClaimData[] = [];

  console.log(`Processing ${wallets.length} wallets...\n`);
  console.log(`Connecting to contract and preparing queries...`);

  // Process wallets in batches to avoid rate limiting
  const batchSize = 10;
  const totalBatches = Math.ceil(wallets.length / batchSize);
  console.log(`Using batch size: ${batchSize} wallets per batch`);
  console.log(`Total batches to process: ${totalBatches}\n`);

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < wallets.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = wallets.slice(i, i + batchSize);
    
    console.log(`\n[Batch ${batchNumber}/${totalBatches}] Processing ${batch.length} wallets...`);
    const batchStartTime = Date.now();
    
    const batchPromises = batch.map(async (wallet) => {
      try {
        const walletAddress = ethers.utils.getAddress(wallet.wallet); // Normalize address
        const walletAddressLower = walletAddress.toLowerCase();
        const isAdmin = ADMIN_WALLETS.includes(walletAddressLower);
        
        // Query both functions
        const [tokensClaimed, lastClaimed] = await Promise.all([
          contract.tokensClaimed(walletAddress),
          contract.lastClaimed(walletAddress),
        ]);

        // Format the results
        const tokensClaimedFormatted = ethers.utils.formatEther(tokensClaimed);
        const lastClaimedBigNumber = ethers.BigNumber.from(lastClaimed);
        const lastClaimedTimestamp = lastClaimedBigNumber.toNumber();
        const lastClaimedDate =
          lastClaimedTimestamp > 0
            ? new Date(lastClaimedTimestamp * 1000).toISOString()
            : null;

        // Calculate claimable amount if allocation is provided
        // Use 'amount' from wallets.json or 'amountAllocated' if provided
        // Note: amounts in wallets.json are already formatted (not in wei)
        const allocationAmount = wallet.amount || wallet.amountAllocated;
        let amountAllocated: string | undefined;
        let claimable: string | undefined;
        let leftToClaim: string | undefined;
        let total: string | undefined;
        
        if (allocationAmount) {
          // Amount is already formatted (in token units), convert to wei for calculation
          const allocatedBN = ethers.utils.parseEther(allocationAmount);
          const claimableBN = allocatedBN.sub(tokensClaimed);
          // Ensure non-negative (BigNumber doesn't have max, so use comparison)
          const claimableAmount = claimableBN.gte(0) ? claimableBN : ethers.BigNumber.from(0);
          claimable = ethers.utils.formatEther(claimableAmount);
          leftToClaim = claimable; // Amount left to claim is the same as claimable
          // Store amount as-is (already formatted)
          amountAllocated = allocationAmount;
          total = allocationAmount; // Total allocation per wallet
        } else {
          // If no allocation, total is just what's claimed
          total = tokensClaimedFormatted;
          // Cannot calculate left to claim without allocation data
          leftToClaim = undefined;
        }

        return {
          wallet: walletAddress,
          tokensClaimed: tokensClaimedFormatted,
          lastClaimed: lastClaimedTimestamp.toString(),
          lastClaimedDate,
          isAdmin,
          amountAllocated: amountAllocated || null,
          claimable: claimable || null,
          total,
          leftToClaim: leftToClaim || null,
        };
      } catch (error) {
        console.error(`  ❌ Error querying wallet ${wallet.wallet}:`, error instanceof Error ? error.message : String(error));
        const walletAddressLower = ethers.utils.getAddress(wallet.wallet).toLowerCase();
        const isAdmin = ADMIN_WALLETS.includes(walletAddressLower);
        
        return {
          wallet: wallet.wallet,
          tokensClaimed: "ERROR",
          lastClaimed: "ERROR",
          lastClaimedDate: null,
          isAdmin,
          amountAllocated: (wallet.amount || wallet.amountAllocated) || null,
          claimable: null,
          total: (wallet.amount || wallet.amountAllocated) || "ERROR",
          leftToClaim: null,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Count successes and errors
    const batchSuccess = batchResults.filter(r => r.tokensClaimed !== "ERROR").length;
    const batchErrors = batchResults.length - batchSuccess;
    successCount += batchSuccess;
    errorCount += batchErrors;

    const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(2);
    const progress = ((Math.min(i + batchSize, wallets.length) / wallets.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    
    console.log(`  ✓ Batch ${batchNumber} completed in ${batchTime}s`);
    console.log(`  ✓ Success: ${batchSuccess}, Errors: ${batchErrors}`);
    console.log(`  Progress: ${progress}% (${Math.min(i + batchSize, wallets.length)}/${wallets.length}) - Elapsed: ${elapsed}s`);
    
    // Estimate remaining time
    if (batchNumber < totalBatches) {
      const avgTimePerBatch = (Date.now() - startTime) / batchNumber;
      const remainingBatches = totalBatches - batchNumber;
      const estimatedRemaining = (avgTimePerBatch * remainingBatches / 1000).toFixed(0);
      console.log(`  ⏱️  Estimated time remaining: ~${estimatedRemaining}s`);
    }
  }

  console.log(`\n✅ Finished processing all wallets!`);
  console.log(`   Total successful: ${successCount}, Total errors: ${errorCount}`);
  console.log(`   Total time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  // Calculate summary statistics
  console.log("\n📊 Calculating summary statistics...");
  
  // Calculate total amount from wallets.json (sum of all 'amount' fields)
  // Amounts are already formatted (not in wei), so parse directly as float
  const totalAmountFromWallets = wallets.reduce((sum, wallet) => {
    const amount = wallet.amount || wallet.amountAllocated;
    if (amount) {
      const amountFloat = parseFloat(amount);
      return sum + (isNaN(amountFloat) ? 0 : amountFloat);
    }
    return sum;
  }, 0);
  
  const totalClaimed = results.reduce((sum, r) => {
    const amount = parseFloat(r.tokensClaimed);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const walletsWithClaims = results.filter(
    (r) => r.tokensClaimed !== "ERROR" && parseFloat(r.tokensClaimed) > 0
  ).length;

  const walletsWithLastClaim = results.filter(
    (r) => r.lastClaimed !== "ERROR" && parseInt(r.lastClaimed) > 0
  ).length;

  // Calculate total claimable amount
  const totalClaimable = results.reduce((sum, r) => {
    if (r.claimable && r.claimable !== "ERROR") {
      const amount = parseFloat(r.claimable);
      return sum + (isNaN(amount) ? 0 : amount);
    }
    return sum;
  }, 0);

  const walletsWithAllocations = results.filter(
    (r) => r.amountAllocated !== null && r.amountAllocated !== undefined && r.amountAllocated !== "ERROR"
  ).length;

  // Calculate additional totals
  const totalAllocated = results.reduce((sum, r) => {
    if (r.amountAllocated && r.amountAllocated !== null && r.amountAllocated !== "ERROR") {
      const amount = parseFloat(r.amountAllocated);
      return sum + (isNaN(amount) ? 0 : amount);
    }
    return sum;
  }, 0);

  // Calculate per-wallet totals
  const totalPerWallet = results.reduce((sum, r) => {
    if (r.total && r.total !== "ERROR") {
      const amount = parseFloat(r.total);
      return sum + (isNaN(amount) ? 0 : amount);
    }
    return sum;
  }, 0);

  // Calculate wallets with amounts left to claim
  const walletsWithLeftToClaim = results.filter(r => {
    if (r.leftToClaim && r.leftToClaim !== "ERROR") {
      const amount = parseFloat(r.leftToClaim);
      return !isNaN(amount) && amount > 0;
    }
    return false;
  }).length;

  // Calculate total left to claim
  const totalLeftToClaim = results.reduce((sum, r) => {
    if (r.leftToClaim && r.leftToClaim !== "ERROR") {
      const amount = parseFloat(r.leftToClaim);
      return sum + (isNaN(amount) ? 0 : amount);
    }
    return sum;
  }, 0);

  // Calculate admin wallet statistics
  const adminWallets = results.filter(r => r.isAdmin === true);
  const adminTotalAmount = adminWallets.reduce((sum, r) => {
    if (r.amountAllocated && r.amountAllocated !== "ERROR" && r.amountAllocated !== null) {
      const amount = parseFloat(r.amountAllocated);
      return sum + (isNaN(amount) ? 0 : amount);
    }
    return sum;
  }, 0);
  const adminTotalClaimed = adminWallets.reduce((sum, r) => {
    if (r.tokensClaimed && r.tokensClaimed !== "ERROR") {
      const amount = parseFloat(r.tokensClaimed);
      return sum + (isNaN(amount) ? 0 : amount);
    }
    return sum;
  }, 0);

  console.log("\n=== Summary ===");
  console.log(`Total wallets processed: ${results.length}`);
  console.log(`Wallets with claims: ${walletsWithClaims}`);
  console.log(`Wallets with lastClaimed timestamp: ${walletsWithLastClaim}`);
  console.log(`\n💰 Total Amounts:`);
  console.log(`   Total amount from wallets.json: ${totalAmountFromWallets.toFixed(2)} tokens`);
  console.log(`   Total tokens claimed: ${totalClaimed.toFixed(2)} tokens`);
  console.log(`   Total per wallet (sum of all wallet totals): ${totalPerWallet.toFixed(2)} tokens`);
  if (walletsWithAllocations > 0) {
    console.log(`   Total amount allocated: ${totalAllocated.toFixed(2)} tokens`);
    console.log(`   Total amount claimable: ${totalClaimable.toFixed(2)} tokens`);
    console.log(`   Total left to claim: ${totalLeftToClaim.toFixed(2)} tokens`);
    console.log(`\n📋 Wallets with amounts left to claim: ${walletsWithLeftToClaim}`);
  } else {
    console.log(`\n   Note: To see allocated and claimable amounts, add 'amountAllocated' field to wallets.json`);
    console.log(`   Claimable = amountAllocated - tokensClaimed`);
    console.log(`\n   Current status:`);
    console.log(`   - Total left to claim: ${totalLeftToClaim.toFixed(2)} tokens (requires allocation data)`);
    console.log(`   - Wallets with amounts left to claim: ${walletsWithLeftToClaim} (requires allocation data)`);
  }

  // Display admin wallet statistics
  console.log(`\n👑 Admin Wallet Statistics:`);
  console.log(`   Total admin wallets: ${adminWallets.length}`);
  console.log(`   Total amount allocated to admins: ${adminTotalAmount.toFixed(2)} tokens`);
  console.log(`   Total claimed by admins: ${adminTotalClaimed.toFixed(2)} tokens`);
  if (adminTotalAmount > 0) {
    const adminClaimedPercentage = (adminTotalClaimed / adminTotalAmount * 100).toFixed(2);
    console.log(`   Admin claim percentage: ${adminClaimedPercentage}%`);
  }

  // Show per-wallet summary (top 10 by tokens claimed)
  console.log(`\n📊 Top 10 Wallets by Tokens Claimed:`);
  const topWallets = results
    .filter(r => r.tokensClaimed !== "ERROR")
    .map(r => ({
      wallet: r.wallet,
      tokensClaimed: parseFloat(r.tokensClaimed),
      total: r.total ? parseFloat(r.total) : parseFloat(r.tokensClaimed),
      claimable: r.claimable ? parseFloat(r.claimable) : 0,
    }))
    .sort((a, b) => b.tokensClaimed - a.tokensClaimed)
    .slice(0, 10);

  topWallets.forEach((w, idx) => {
    const walletData = results.find(r => r.wallet === w.wallet);
    console.log(`   ${idx + 1}. ${w.wallet}`);
    console.log(`      Claimed: ${w.tokensClaimed.toFixed(2)} tokens`);
    if (w.total !== w.tokensClaimed) {
      console.log(`      Total: ${w.total.toFixed(2)} tokens`);
      console.log(`      Claimable: ${w.claimable.toFixed(2)} tokens`);
    }
    if (walletData?.leftToClaim && parseFloat(walletData.leftToClaim) > 0) {
      console.log(`      Left to claim: ${walletData.leftToClaim} tokens`);
    }
  });

  // Output results (optional - commented out to reduce console clutter, uncomment if needed)
  // console.log("\n=== Results ===");
  // console.log(JSON.stringify(results, null, 2));

  // Save results to file with summary
  console.log("\n💾 Saving results to file...");
  const outputPath = path.join(__dirname, "claimed_tokens_results.json");
  
  // Create output object with summary
  const outputData = {
    summary: {
      totalWallets: results.length,
      walletsWithClaims,
      walletsWithLastClaim,
      totalAmountFromWallets: totalAmountFromWallets.toFixed(2),
      totalTokensClaimed: totalClaimed.toFixed(2),
      totalPerWallet: totalPerWallet.toFixed(2),
      totalLeftToClaim: totalLeftToClaim.toFixed(2),
      walletsWithLeftToClaim,
      adminWallets: {
        totalAdminWallets: adminWallets.length,
        totalAmountAllocated: adminTotalAmount.toFixed(2),
        totalClaimed: adminTotalClaimed.toFixed(2),
        ...(adminTotalAmount > 0 && {
          claimPercentage: ((adminTotalClaimed / adminTotalAmount) * 100).toFixed(2),
        }),
      },
      ...(walletsWithAllocations > 0 && {
        totalAmountAllocated: totalAllocated.toFixed(2),
        totalAmountClaimable: totalClaimable.toFixed(2),
        walletsWithAllocations,
      }),
    },
    results,
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`✅ Results saved to: ${outputPath}`);
  console.log(`\n✨ Script completed successfully!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

