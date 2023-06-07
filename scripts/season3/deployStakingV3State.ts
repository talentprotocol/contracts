import { ethers, upgrades, network } from "hardhat";

import axios from "axios";

import { RewardCalculatorV2, StakingV3State, TalentFactoryV3Migration, VirtualTAL } from "../../typechain-types";
import { HttpNetworkConfig } from "hardhat/types";

const { parseUnits } = ethers.utils;

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);

  const networkConfig = network.config as HttpNetworkConfig;
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.url);

  console.log("network", network.name);

  let oldStakingAddr = "";

  switch (network.name) {
    case "celo":
      oldStakingAddr = "0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636";

      break;
    case "polygon":
      oldStakingAddr = "0xEa998Ff9c0c075cD035b25095D1833E5aF0aF873";

      break;

    case "alfajores":
      oldStakingAddr = "0xfc35754091D1540cE605Db87e5284369D766F0bF";

      break;

    case "mumbai":
      oldStakingAddr = "0x3678cE749b0ffa5C62dd9b300148259d2DFAE572";

      break;
    default:
      break;
  }

  const oldStaking = await ethers.getContractAt("StakingMigration", oldStakingAddr);

  const start = await oldStaking.start();
  const end = await oldStaking.end();
  const stableCoin = await oldStaking.stableCoin();
  const tokenPrice = await oldStaking.tokenPrice();
  const talentPrice = await oldStaking.talentPrice();
  const rewards = await oldStaking.rewardsMax();

  const FactoryFactory = await ethers.getContractFactory("TalentFactoryV3Migration");
  const factory = (await upgrades.deployProxy(FactoryFactory, [])) as TalentFactoryV3Migration;
  await factory.deployed();
  console.log("factory address:", factory.address);

  const RewardCalculator = await ethers.getContractFactory("RewardCalculatorV2");
  const rewardCalculator = (await upgrades.deployProxy(RewardCalculator, [])) as RewardCalculatorV2;
  await rewardCalculator.deployed();
  console.log("rewardCalculator address:", rewardCalculator.address);

  const VirtualTAL = await ethers.getContractFactory("VirtualTAL");
  const virtualTAL = (await upgrades.deployProxy(VirtualTAL, [])) as VirtualTAL;
  await virtualTAL.deployed();
  console.log("virtualTAL address:", virtualTAL.address);

  const StakingFactory = await ethers.getContractFactory("StakingV3State");
  const staking = (await upgrades.deployProxy(StakingFactory, [
    start,
    end,
    rewards,
    stableCoin,
    factory.address,
    tokenPrice, // how much cUSD must be spent for 1 TAL
    talentPrice, // how much TAL must be spent for 1 Talent Token
    rewardCalculator.address,
    virtualTAL.address,
  ])) as StakingV3State;
  await staking.deployed();
  console.log("staking address:", staking.address);

  let options = {};

  if (network.name == "polygon") {
    const response = await axios.get("https://gasstation-mainnet.matic.network/v2");
    const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
    const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
    options = {
      maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
      maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
    };
  }

  const setAdminRole = await virtualTAL.setAdminRole(staking.address, options);
  await setAdminRole.wait();
  console.log(
    "is staking admin role in virtual tal?",
    await virtualTAL.hasRole(await virtualTAL.DEFAULT_ADMIN_ROLE(), staking.address)
  );

  const setMinter = await factory.setMinter(staking.address, options);
  await setMinter.wait();
  console.log("factory's minter:", await factory.minter());
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
