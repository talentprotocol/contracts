import { ethers, upgrades } from "hardhat";
import type { StateStakingV3, StakingV3, RewardCalculatorV2, VirtualTAL } from "../../typechain-types";

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner: ", owner.address);

  const factory = await ethers.getContractAt("TalentFactoryV3", "0x8ee4f3044Ef0166A6DB12b0e9Eeb1735f1Fc7cc9");

  const oldStaking = await ethers.getContractAt("Staking", "0xfc35754091D1540cE605Db87e5284369D766F0bF");

  const start = await oldStaking.start();
  const end = await oldStaking.end();
  const rewards = ethers.utils.parseUnits("400000000");
  const stableAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

  console.log("start", start);
  console.log("end", end);

  // const RewardCalculatorV2 = await ethers.getContractFactory("RewardCalculatorV2");
  // const rewardCalculatorV2 = (await upgrades.deployProxy(RewardCalculatorV2, [])) as RewardCalculatorV2;
  // await rewardCalculatorV2.deployed();
  const rewardCalculatorV2 = await ethers.getContractAt(
    "RewardCalculatorV2",
    "0x14A743E115CfE9e88075B2f9912dee66452C914e"
  );

  console.log("rewardCalculator address:", rewardCalculatorV2.address);

  // const VirtualTAL = await ethers.getContractFactory("VirtualTAL");
  // const virtualTAL = (await upgrades.deployProxy(VirtualTAL, [])) as VirtualTAL;
  // await virtualTAL.deployed();
  const virtualTAL = await ethers.getContractAt("VirtualTAL", "0x838087d22B57952c5E4ff37D46682d71f066B08f");

  console.log("virtualTAL address:", virtualTAL.address);

  // const StateStakingV3 = await ethers.getContractFactory("StateStakingV3");
  // const stakingV3 = (await upgrades.deployProxy(StateStakingV3, [
  //   start,
  //   end,
  //   rewards,
  //   stableAddress,
  //   factory.address,
  //   ethers.utils.parseUnits("0.02"),
  //   ethers.utils.parseUnits("5"),
  //   rewardCalculatorV2.address,
  //   virtualTAL.address,
  // ])) as StateStakingV3;
  // await stakingV3.deployed();
  const stakingV3 = await ethers.getContractAt("StateStakingV3", "0x7248460C2366CCf3ec104c26D52aA0b52D309F2A");

  console.log("StakingV3 address:", stakingV3.address);

  // const tx1 = await factory.transferMinter(stakingV3.address);
  // await tx1.wait();

  // const minter = await factory.minter();

  // console.log("minter: ", minter);

  const tx2 = await virtualTAL.connect(owner).hasRole(stakingV3.DEFAULT_ADMIN_ROLE(), stakingV3.address);
  // await tx2.wait();

  console.log(tx2);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
