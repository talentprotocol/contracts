import { ethers, network } from "hardhat";

import { deploySponsorship } from "./shared";

const imageURI = process.env.LEVEL_ONE_IMAGE_URI!;

async function main() {
  console.log(`Deploying sponsorship package ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const sponsorship = await deploySponsorship();

  console.log(`TalentSponsorship Address: ${sponsorship.address}`);

  console.log("Done")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
