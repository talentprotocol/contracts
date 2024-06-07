import { ethers, network } from "hardhat";

async function main() {
  console.log(`Deploying buy points at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const buyPoints = await ethers.getContractFactory("BuyPoints");

  const contract = await buyPoints.deploy();
  await contract.deployed();

  console.log(`BuyPoints Address: ${contract.address}`);
  console.log(`BuyPoints owner: ${await contract.owner()}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
