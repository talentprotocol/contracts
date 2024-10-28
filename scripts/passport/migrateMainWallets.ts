import { ethers, network } from "hardhat";
import { PassportWalletRegistry } from "../../test/shared/artifacts";
import MAIN_WALLET_CHANGES from "../data/main-wallet-changes.json";

async function main() {
  const [admin] = await ethers.getSigners();

  const passportWalletRegistry = new ethers.Contract(
    "0x9B729d9fC43e3746855F7E02238FB3a2A20bD899",
    PassportWalletRegistry.abi,
    admin
  );

  const data = MAIN_WALLET_CHANGES as { passport_id: number; main_wallet: string }[];

  console.log("MIGRATING: ", data.length, "WALLETS");
  let i = 0;

  for (const item of data) {
    i++;
    console.log(`MIGRATING: ${i}/${data.length} - ${item.main_wallet} - ${item.passport_id}`);
    const tx = await passportWalletRegistry.adminAddWallet(item.main_wallet, item.passport_id);
    console.log(`TX included: https://basescan.org/tx/${tx.hash}`);

    const validationId = await passportWalletRegistry.passportId(item.main_wallet);
    if (validationId.toString() !== item.passport_id.toString()) {
      console.log("VALUES ARE NOT EQUAL: ", validationId.toString(), item.passport_id.toString());
      process.exit(1);
    } else {
      console.log("VALUES ARE EQUAL: ", validationId.toString(), item.passport_id.toString());
    }
    await tx.wait();
  }
  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
