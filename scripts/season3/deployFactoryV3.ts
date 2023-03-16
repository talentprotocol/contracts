import { ethers, upgrades } from "hardhat";
import type { TalentFactoryV3 } from "../../typechain-types";
import TalentFactoryV2 from "../../artifacts/contracts/TalentFactoryV2.sol/TalentFactoryV2.json";

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner:", owner.address);

  const TalentFactoryV2Factory = await ethers.getContractFactory("TalentFactoryV2", owner);
  const factoryProxy = await ethers.getContractAt("TalentFactoryV2", "0xa902DA7a40a671B84bA3Dd0BdBA6FD9d2D888246");
  console.log("old factory proxy:", factoryProxy.address);

  const adminAddress = await upgrades.erc1967.getAdminAddress(factoryProxy.address);
  console.log("adminAddress:", adminAddress);

  // await upgrades.forceImport(factoryProxy.address, TalentFactoryV2Factory);

  // console.log("Force imported");

  const beaconAddr = await factoryProxy.implementationBeacon();

  console.log("beacon address: ", beaconAddr);

  // const TalentFactoryV3 = await ethers.getContractFactory("TalentFactoryV3");

  // const factoryV3 = (await upgrades.upgradeProxy(factoryProxy, TalentFactoryV3)) as TalentFactoryV3;
  // await factoryV3.deployed();

  // const factoryV3Address = await upgrades.erc1967.getImplementationAddress(factoryProxy.address);
  // console.log("FactoryV3 Implementation address:", factoryV3Address);
  // console.log("Factory V3 proxy", factoryProxy.address);
  // console.log("factory V3 is version:", await factoryProxy.version());
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
