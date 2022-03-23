import { ethers, network } from "hardhat";

import { deployMemberLevelOne } from "./shared";

const imageURI = process.env.LEVEL_ONE_IMAGE_URI!;

async function main() {
  console.log(`Deploying Community Member Level one to ${network.name}`);

  const [creator] = await ethers.getSigners();

  console.log(`Owner will be ${creator.address}`);

  const levelOne = await deployMemberLevelOne(creator.address, "TALMEMBERS1");

  console.log(`CommunityMember Address: ${levelOne.address}`);

  console.log("Setting base URI");

  console.log(`ImageURI: ${imageURI}`);

  // Set base URI
  await levelOne.connect(creator).setBaseURI(imageURI);

  console.log("Assigning one NFT to the creator");

  await levelOne.connect(creator).airdrop([creator.address]);

  console.log("Done")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
