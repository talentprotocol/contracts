import { ethers, network } from "hardhat";
import SmartBuilderScore from "./SmartBuilderScore.json";
import listOfTransactions from "./listOfTransactions.json";
import fs from "fs";

const checkPassportForJumperCredential = async (passportId: string) => {
  const response = await fetch(
    `https://api.talentprotocol.com/api/v2/credentials/checks/jumper_pass?passport_id=${passportId}`,
    {
      headers: {
        "X-API-KEY": "b555502549b8bc0641f85e6d1051e9b1",
      },
    }
  );
  const { data } = await response.json();
  return data.result;
};

async function main() {
  const [admin] = await ethers.getSigners();
  const provider = new ethers.providers.JsonRpcProvider(
    "https://api.developer.coinbase.com/rpc/v1/base/w6ubd9S5jJzUzPlMn0yYmuP9UWbjKvrH"
  );

  console.log(`Wallet in use - ${admin.address}`);

  const builderScoreInterface = new ethers.utils.Interface(SmartBuilderScore);

  let totalFees = 0.0;
  let totalFeesForCredentialsAll = 0.0;
  let totalFeesForCredentials = 0.0;
  const checkedPassports = new Set();
  const eligibleWallets = new Set();

  for (const tx of listOfTransactions) {
    const receipt = await provider.getTransactionReceipt(tx);

    if (receipt.blockNumber < 23613818) {
      continue;
    }

    for (const log of receipt.logs) {
      if (log.address !== "0xE23104E89fF4c93A677136C4cBdFD2037B35BE67") {
        continue;
      }
      totalFees += 0.001;
      const parsedLog = builderScoreInterface.parseLog(log);
      const passportId = parsedLog.args.passportId.toString();
      const score = parsedLog.args.score.toString();
      console.log(`Passport ID: ${passportId}, Score: ${score}`);
      if (checkedPassports.has(passportId)) {
        totalFeesForCredentialsAll += 0.001;
        continue;
      }
      checkedPassports.add(passportId);
      const hasCredential = await checkPassportForJumperCredential(passportId);
      if (hasCredential) {
        eligibleWallets.add(receipt.from);
        totalFeesForCredentialsAll += 0.001;
        totalFeesForCredentials += 0.001;
      }
    }
  }

  console.log(`Total fees: ${totalFees}`);
  console.log(`Total fees for credentials: ${totalFeesForCredentialsAll}`);
  console.log(`Total fees for credentials only counting the first time: ${totalFeesForCredentials}`);
  console.log(`Eligible wallets: ${eligibleWallets.size}`);

  // write eligible wallets to a file
  fs.writeFileSync("eligibleWallets.txt", Array.from(eligibleWallets).join("\n"));
  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
