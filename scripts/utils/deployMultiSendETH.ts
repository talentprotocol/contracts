import { ethers, network } from "hardhat";
import hre from "hardhat";

async function main() {
  console.log(`Deploying MultiSendETH at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);
  console.log("Account balance:", (await admin.getBalance()).toString());

  // Deploy the MultiSendETH contract
  const MultiSendETH = await ethers.getContractFactory("MultiSendETH");
  const multiSendETH = await MultiSendETH.deploy();

  await multiSendETH.deployed();

  console.log(`MultiSendETH Address: ${multiSendETH.address}`);
  console.log(`Transaction hash: ${multiSendETH.deployTransaction.hash}`);

  // Verify deployment
  const arrayLimit = await multiSendETH.ARRAY_LIMIT();
  console.log(`Array limit: ${arrayLimit.toString()}`);

  // Verify contract on Sourcify (only for non-local networks)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await multiSendETH.deployTransaction.wait(5);

    console.log("Verifying contract on Sourcify...");
    try {
      await hre.run("verify:sourcify", {
        address: multiSendETH.address,
      });
      console.log("Contract verified successfully on Sourcify!");
    } catch (error) {
      console.log("Sourcify verification failed:", error instanceof Error ? error.message : String(error));
    }

    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: multiSendETH.address,
      });
      console.log("Contract verified successfully on Etherscan!");
    } catch (error) {
      console.log("Etherscan verification failed:", error instanceof Error ? error.message : String(error));
    }
  }

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
