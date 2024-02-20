import { ethers, network } from "hardhat";

import { deployPassport } from "../shared";

async function main() {
  console.log(`Deploying buy vTal package ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const passport = await deployPassport(admin.address);

  console.log(`Passport Address: ${passport.address}`);
  console.log(`Passport owner: ${await passport.owner()}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
