import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { deployTalentCommunitySale } from "../shared";

async function main() {
  console.log(`Deploying Talent Token at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const communitySaleContract = await deployTalentCommunitySale(
    admin.address,
    "0x24625d49c91f2b01c3415ba44e140d54446e4e60", // TESTNET BUILD
    18
  );

  console.log(`Community sale address: ${communitySaleContract.address}`);
  console.log(`Talent Token owner: ${await communitySaleContract.owner()}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
