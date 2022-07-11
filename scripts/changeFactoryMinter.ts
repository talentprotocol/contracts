import { ethers, upgrades } from "hardhat";
import { getImplementationAddress } from '@openzeppelin/upgrades-core';
import * as FactoryArtifact from "../artifacts/contracts/TalentFactory.sol/TalentFactory.json";
import * as FactoryArtifactV2 from "../artifacts/contracts/TalentFactoryV2.sol/TalentFactoryV2.json";
import type { TalentFactory, TalentFactoryV2 } from "../typechain";


const { exit } = process;

async function main() {
  const [owner1, owner2] = await ethers.getSigners();

  console.log("owner1: ", owner1.address);
  console.log("owner2: ", owner2.address);
  
  const provider =  new ethers.providers.JsonRpcProvider("https://alfajores-forno.celo-testnet.org");

  const currentImplAddress = await getImplementationAddress(provider, "0x8ee4f3044Ef0166A6DB12b0e9Eeb1735f1Fc7cc9");
  console.log("Factory Implementation address: ", currentImplAddress);

  const factory = new ethers.Contract(
    "0x8ee4f3044Ef0166A6DB12b0e9Eeb1735f1Fc7cc9",
    FactoryArtifactV2.abi,
    owner1
  );
  
  console.log("Factory v2: ", await factory.isV2());

  console.log("Factory minter is: ", await factory.ROLE_MINTER());
  console.log("Factory Signer: ", await factory.signer.getAddress());

  const TalentFactoryFactory = await ethers.getContractFactory("TalentFactory", owner2);

  console.log("Got deployed factory");
  
  const TalentFactoryV2Factory = await ethers.getContractFactory("TalentFactoryV2", owner2);
  const factory2 = await TalentFactoryV2Factory.deploy();
  await factory2.deployed();

  console.log("Deployed version 2");

  // const factoryProxy = await upgrades.forceImport(factory.address, TalentFactoryFactory);

  console.log("Force imported");

  const factoryV2 = await upgrades.upgradeProxy(factory, TalentFactoryV2Factory);

  const newFactory = await TalentFactoryV2Factory.deploy();
  await newFactory.deployed();
  console.log("Upgrade with signer: ", await factoryV2.signer.getAddress());
  console.log("New factory address: ", factoryV2.address);

  // console.log("New implementation address: ", newImplementation.address);
  // console.log("Upgrade Signer: ", await TalentFactoryV2Factory.signer.getAddress());

  // const factoryV2 = await upgrades.upgradeProxy(factory, TalentFactoryV2Factory);

  // console.log("Factory address: ", factory.address);

  // const factory2ImplAddr = await upgrades.prepareUpgrade(factory.address, newImplementation);

  // console.log("Implementation address: ", factory2ImplAddr);

  // TalentFactoryV2Factory.attach(factory2ImplAddr);

  // await factory.upgradeTo(newImplementation.address);

  // console.log("Attached");

  await factoryV2.connect(owner1).transferMinter("0xfc35754091D1540cE605Db87e5284369D766F0bF");

  console.log("Transferred minter");
  
  console.log("Staking address is: ", "0xfc35754091D1540cE605Db87e5284369D766F0bF");
  console.log("Factory2 minter is: ", await factory.ROLE_MINTER());
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
