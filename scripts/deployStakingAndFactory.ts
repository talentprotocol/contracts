import { BigNumber } from "@ethersproject/bignumber";
import { ethers, network } from "hardhat";
import { deployStaking, deployFactory } from "./shared";
import dayjs from "dayjs";

const { parseUnits } = ethers.utils;

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

const mainnet: NetworkConfig = {
  usdStableCoinContract: process.env.MAINNET_CUSD!,
  talPriceInUsd: process.env.TAL_PRICE_IN_USD!,
  talentPriceInTal: process.env.TALENT_PRICE_IN_TAL!,
};

const Configs: Record<string, NetworkConfig> = {
  alfajores,
  mainnet,
};

async function main() {
  const config = Configs[network.name];

  if (!config) {
    throw `No config found for network ${config}`;
  }

  const factory = await deployFactory();
  const staking = await deployStaking(
    dayjs().add(-1, "day").unix(),
    dayjs().add(1, "month").unix(),
    BigNumber.from("400000000000"),
    config.usdStableCoinContract,
    factory.address,
    parseUnits(config.talPriceInUsd),
    parseUnits(config.talentPriceInTal)
  );

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
