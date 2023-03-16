import { ethers, upgrades } from "hardhat";
import type { FinalStakingV3 } from "../../typechain-types";

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner: ", owner.address);

  const StakingMigrationV3 = await ethers.getContractFactory("StakingMigrationV3");
  const oldStaking = await ethers.getContractAt("StakingMigrationV3", "0x7248460C2366CCf3ec104c26D52aA0b52D309F2A");

  const oldStakingImplAddress = await upgrades.erc1967.getImplementationAddress(oldStaking.address);
  console.log("Old Staking address: ", oldStaking.address);
  console.log("Old Staking Implementation address: ", oldStakingImplAddress);

  // const contract = await upgrades.forceImport(oldStaking.address, StakingMigrationV3);

  // // console.log("Force imported");

  const FinalStakingV3 = await ethers.getContractFactory("FinalStakingV3");
  const staking = (await upgrades.upgradeProxy(oldStaking.address, FinalStakingV3)) as FinalStakingV3;
  await staking.deployed();
  const stakingImplAddress = await upgrades.erc1967.getImplementationAddress(staking.address);

  console.log("New Staking address: ", staking.address);
  console.log("New Staking Implementation address: ", stakingImplAddress);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
