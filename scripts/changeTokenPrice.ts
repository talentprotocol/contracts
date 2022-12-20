import { ethers } from "hardhat";
import * as StakingMigrationArtifact from "../artifacts/contracts/StakingMigration.sol/StakingMigration.json";

const { parseUnits } = ethers.utils;

async function main() {
  const [owner] = await ethers.getSigners();

  const provider =  new ethers.providers.JsonRpcProvider("https://polygon-rpc.com/");

  const staking = new ethers.Contract(
    "0xE23104E89fF4c93A677136C4cBdFD2037B35BE67",
    StakingMigrationArtifact.abi,
    provider
  )

  // const provider =  new ethers.providers.JsonRpcProvider("https://matic-mumbai.chainstacklabs.com");

  // const staking = new ethers.Contract(
  //   "0x3678cE749b0ffa5C62dd9b300148259d2DFAE572",
  //   StakingMigrationArtifact.abi,
  //   provider
  // )

  // await staking.connect(owner).setTokenPrice(parseUnits("0.02", 6));
  // await staking.connect(owner).setTokenPrice(parseUnits("0.02"));

  const tokenPrice = await staking.connect(owner).tokenPrice();

  console.log("TOKEN PRICE: ", tokenPrice.toNumber());
  console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
