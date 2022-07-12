import { ethers, upgrades } from "hardhat";
import type { TalentFactory, TalentFactoryV2 } from "../typechain-types";


const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  const FactoryFactory = await ethers.getContractFactory("TalentFactory");
  let factory = (await upgrades.deployProxy(FactoryFactory, [])) as TalentFactory;

  console.log(factory.address);

  const FactoryFactoryV2 = await ethers.getContractFactory("TalentFactoryV2");
  const factoryv2 = (await upgrades.upgradeProxy(factory, FactoryFactoryV2)) as TalentFactoryV2;

  console.log("is version v2: ", await factoryv2.isV2());
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
