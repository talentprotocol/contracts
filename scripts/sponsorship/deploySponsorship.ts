import { ethers, network } from "hardhat";

import { deploySponsorship } from "../shared";

async function main() {
  console.log(`Deploying sponsorship package ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const sponsorship = await deploySponsorship();

  // Alfajores 0xAaAF2e4e4252101Ed57Be5Faa64Fc87B2d79bD34
  // Mumbai 0xAaAF2e4e4252101Ed57Be5Faa64Fc87B2d79bD34

  console.log(`TalentSponsorship Address: ${sponsorship.address}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
