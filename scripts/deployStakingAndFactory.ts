import { BigNumber } from "@ethersproject/bignumber";
import { ethers, network, upgrades, waffle } from "hardhat";
import { deployStaking, deployFactory } from "./shared";
import * as StakingArtifact from "../artifacts/contracts/Staking.sol/Staking.json";
import dayjs from "dayjs";
import type { TalentFactory, Staking } from "../typechain";

const { parseUnits } = ethers.utils;
const { deployContract } = waffle;
interface NetworkConfig {
  usdStableCoinContract: string;
  talPriceInUsd: string;
  talentPriceInTal: string;
}

const alfajores: NetworkConfig = {
  usdStableCoinContract: process.env.ALFAJORES_CUSD!,
  talPriceInUsd: process.env.TAL_PRICE_IN_USD!,
  talentPriceInTal: process.env.TALENT_PRICE_IN_TAL!,
};

const hardhat: NetworkConfig = {
  usdStableCoinContract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  talPriceInUsd: process.env.TAL_PRICE_IN_USD!,
  talentPriceInTal: process.env.TALENT_PRICE_IN_TAL!,
};

const celo: NetworkConfig = {
  usdStableCoinContract: process.env.MAINNET_CUSD!,
  talPriceInUsd: process.env.TAL_PRICE_IN_USD!,
  talentPriceInTal: process.env.TALENT_PRICE_IN_TAL!,
};

const Configs: Record<string, NetworkConfig> = {
  alfajores,
  celo,
  hardhat
};

async function main() {
  const config = Configs[network.name];

  if (!config) {
    throw `No config found for network ${config}`;
  }

  const [owner] = await ethers.getSigners();

  const FactoryFactory = await ethers.getContractFactory("TalentFactory");
  const factory = (await upgrades.deployProxy(FactoryFactory, [])) as TalentFactory;

  const staking = (await deployContract(owner, StakingArtifact, [
    dayjs().add(10, "minute").unix(),
    dayjs().add(40, "year").unix(),
    ethers.utils.parseUnits("400000000"),
    config.usdStableCoinContract,
    factory.address,
    parseUnits("0.02"),
    parseUnits("5"),
  ])) as Staking;


  console.log(`
  TalentFactory: ${factory.address},
  Staking: ${staking.address}
  `);

  console.log("Factory: setting Staking as minter...");
  const tx = await factory.setMinter(staking.address);
  await tx.wait();

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
