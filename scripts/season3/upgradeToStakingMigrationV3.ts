import { ethers, upgrades } from "hardhat";
import type { StakingMigrationV3 } from "../../typechain-types";

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner: ", owner.address);

  const stateStakingV3 = await ethers.getContractAt("StateStakingV3", "0x7248460C2366CCf3ec104c26D52aA0b52D309F2A");
  console.log("Old Staking", stateStakingV3.address);

  const stateStakingV3Address = await upgrades.erc1967.getImplementationAddress(stateStakingV3.address);
  console.log("stateStakingV3 Implementation address:", stateStakingV3Address);

  const StakingMigrationV3 = await ethers.getContractFactory("StakingMigrationV3");
  const stakingMigrationV3 = (await upgrades.upgradeProxy(
    stateStakingV3.address,
    StakingMigrationV3
  )) as StakingMigrationV3;
  await stakingMigrationV3.deployed();

  console.log("StakingMigrationV3 proxy address:", stakingMigrationV3.address);
  const stakingMigrationV3Address = await upgrades.erc1967.getImplementationAddress(stakingMigrationV3.address);
  console.log("stakingMigrationV3 Implementation address:", stakingMigrationV3Address);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
