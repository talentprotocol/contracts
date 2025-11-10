import hre from "hardhat";

async function main() {
  // Hardhat run passes script name and network as first args, so we skip those
  const args = process.argv.slice(2);
  const contractAddress = args[0];
  const ownerAddress = args[1];
  const talentTokenAddress = args[2];
  const vaultAddresses = args.slice(3); // All remaining args are vault addresses

  if (!contractAddress || !ownerAddress || !talentTokenAddress || vaultAddresses.length === 0) {
    console.error("Usage: npx hardhat run scripts/talent_plus/verifyTalentPlusSubscription.ts --network <network> -- <contract> <owner> <token> <vault1> [vault2] ...");
    console.error("Note: Arguments must be passed after --");
    process.exit(1);
  }

  console.log("Verifying contract...");
  console.log(`Contract: ${contractAddress}`);
  console.log(`Owner: ${ownerAddress}`);
  console.log(`TALENT Token: ${talentTokenAddress}`);
  console.log(`Vault Addresses: ${vaultAddresses.join(", ")}`);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [ownerAddress, talentTokenAddress, vaultAddresses],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified!");
    } else {
      console.error("❌ Verification failed:", error.message);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

