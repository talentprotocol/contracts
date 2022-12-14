import { ethers, network } from "hardhat";

import { deployTalentNFT } from "./shared";

async function main() {
  console.log(`Deploying TalentNFT one to ${network.name}`);
  const [creator] = await ethers.getSigners();
  console.log(`Owner will be ${creator.address}`);
  const nftContract = await deployTalentNFT(creator.address, "TalentNFT");
  console.log(`TalentNFT Address: ${nftContract.address}`);

  // @TODO: change to a better URI
  const URI = "ipfs://bafyreifuc7inyu6fhytj2vof6qhrejkla7ohd7qwac33gfwcc57mrbxfn4/metadata.json";
  await nftContract.setBaseURI(URI);

  console.log("Change the URI to: ", URI);

  //console.log("Assigning one NFT to the creator");
  //console.log(await nftContract.connect(creator).mint("1.png"));
  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
