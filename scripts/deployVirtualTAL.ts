import { ethers, upgrades } from "hardhat";
import type { VirtualTAL } from "../typechain-types";

const { exit } = process;

async function main() {
  const [creator] = await ethers.getSigners();
  console.log(creator.address);

  const VirtualTALFactory = await ethers.getContractFactory("VirtualTAL");
  const tal = (await upgrades.deployProxy(VirtualTALFactory, [])) as VirtualTAL;

  console.log("Virtual TAL address is: ", tal.address);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
