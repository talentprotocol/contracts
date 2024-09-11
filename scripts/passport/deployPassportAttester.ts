import { ethers, network } from "hardhat";

import { deployPassportAttester } from "../shared";

async function main() {
  console.log(`Deploying passport attester at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const passportAttester = await deployPassportAttester();

  console.log(`Passport Attester: ${passportAttester.address}`);
  console.log(`Passport Attester owner: ${await passportAttester.owner()}`);

  await passportAttester.setEASContractAddress("0x4200000000000000000000000000000000000021");
  console.log("Set EAS contract address");

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
