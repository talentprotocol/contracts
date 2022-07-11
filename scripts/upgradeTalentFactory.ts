import { ethers, upgrades } from "hardhat";
import { getImplementationAddress } from '@openzeppelin/upgrades-core';
import * as FactoryArtifact from "../artifacts/contracts/TalentFactory.sol/TalentFactory.json";
import * as FactoryArtifactV2 from "../artifacts/contracts/TalentFactoryV2.sol/TalentFactoryV2.json";
import type { TalentFactory, TalentFactoryV2 } from "../typechain";


const { exit } = process;

async function main() {
  const [owner, implementationOwner] = await ethers.getSigners();

  console.log("Owner wallet: ", owner.address);
  
  const provider =  new ethers.providers.JsonRpcProvider("https://forno.celo.org");

  const factory = new ethers.Contract(
    "0xa902DA7a40a671B84bA3Dd0BdBA6FD9d2D888246",
    FactoryArtifact.abi,
    owner
  );

  console.log("Factory minter is: ", await factory.ROLE_MINTER());
  console.log("Factory Signer: ", await factory.signer.getAddress());
  
  const TalentFactoryV2Factory = await ethers.getContractFactory("TalentFactoryV2", implementationOwner);

  console.log("Got contract factory");

  const factoryV2 = await upgrades.upgradeProxy(factory, TalentFactoryV2Factory);

  console.log("Upgraded proxy")

  const newFactory = await TalentFactoryV2Factory.deploy();

  console.log("Deploy factory");

  await newFactory.deployed();

  console.log("Deployed")
  console.log("Upgrade with signer: ", await factoryV2.signer.getAddress());
  console.log("New factory address: ", factoryV2.address);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
