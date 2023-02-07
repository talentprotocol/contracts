import { ethers, upgrades } from "hardhat";
import type { StakingV2 } from "../typechain-types";

const { exit } = process;

async function main() {
  const [creator] = await ethers.getSigners();
  console.log(creator.address);

  const StakingV2Factory = await ethers.getContractFactory("StakingV2");
  const staking = (await upgrades.deployProxy(
    StakingV2Factory,
    []
  )) as StakingV2;

  console.log("Staking address is: ", staking.address);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
