import { ethers, network } from "hardhat";

import { deployPassportBuilderScore } from "../shared";

async function main() {
  console.log(`Deploying passport builder score at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  // @TODO: Replace with registry address
  const passport = await deployPassportBuilderScore("0x0", admin.address);

  console.log(`Scorer Address: ${passport.address}`);
  console.log(`Scorer owner: ${await passport.owner()}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
