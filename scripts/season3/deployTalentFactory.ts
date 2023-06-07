import { ethers, network, upgrades } from "hardhat";

import axios from "axios";

import type { TalentFactoryV3, TalentFactoryV3Migration, TalentTokenV3Migration } from "../../typechain-types";
import { HttpNetworkConfig } from "hardhat/types";
import { polygonTokens, celoTokens, sleep } from "../utils";
import { parseUnits } from "ethers/lib/utils";

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);

  const networkConfig = network.config as HttpNetworkConfig;
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.url);

  console.log("network", network.name);

  let oldTalentFactoryAddr = "";
  let talentFactoryAddr = "";
  let beaconAddr = "";
  let tokens: string[] = [];

  switch (network.name) {
    case "celo":
      oldTalentFactoryAddr = "0xa902DA7a40a671B84bA3Dd0BdBA6FD9d2D888246";
      talentFactoryAddr = "0x8C92E5778E3b4BF3A7B2B7EB060854Bd2251A6F4";
      beaconAddr = "0xea106A676B4bAFEbf037b2f7EC4A930147819CC2";
      tokens = tokens.concat(celoTokens);

      break;
    case "polygon":
      oldTalentFactoryAddr = "0xBBFeDA7c4d8d9Df752542b03CdD715F790B32D0B";
      talentFactoryAddr = "0xA91b75E8aA2Dc62B2957333B1a1412532444FdE0";
      beaconAddr = "0xE69328F9c542DB997deaE0A0dFDEe506b13df7B7";
      tokens = tokens.concat(polygonTokens);

      break;
    default:
      break;
  }

  const oldTalentFactory = await ethers.getContractAt("TalentFactory", oldTalentFactoryAddr);
  const factory = await ethers.getContractAt("TalentFactoryV3", talentFactoryAddr);
  const implementationBeacon = await factory.implementationBeacon();

  console.log("implementationBeacon", implementationBeacon);

  let tokensIndex = 1;
  const tokensTotal = tokens.length;

  const TalentFactoryV3Migration = await ethers.getContractFactory("TalentFactoryV3Migration");

  await upgrades.validateUpgrade(factory, TalentFactoryV3Migration);

  console.log("upgrading factory to TalentFactoryV3Migration");
  const newFactory = (await upgrades.upgradeProxy(factory, TalentFactoryV3Migration)) as TalentFactoryV3Migration;
  await newFactory.deployed();
  console.log("done");

  const TalentTokenV3Migration = await ethers.getContractFactory("TalentTokenV3Migration");

  await upgrades.validateUpgrade(implementationBeacon, TalentTokenV3Migration);

  console.log("upgrading beacon to TalentTokenV3Migration");
  const beacon = (await upgrades.upgradeBeacon(implementationBeacon, TalentTokenV3Migration)) as TalentTokenV3Migration;
  await beacon.deployed();
  console.log("done");

  console.log("beacon address:", beacon.address);
  console.log("beacon implementation address:", await upgrades.beacon.getImplementationAddress(beaconAddr));

  for await (const item of tokens) {
    let response = await axios.get("https://gasstation-mainnet.matic.network/v2");
    let estimatedBaseFee = response.data.estimatedBaseFee;
    let maxFee = 0;
    let maxPriorityFee = 0;
    while (estimatedBaseFee > 400) {
      console.log("paused because base fee is:", estimatedBaseFee);
      response = await axios.get("https://gasstation-mainnet.matic.network/v2");
      estimatedBaseFee = response.data.estimatedBaseFee;

      await sleep(10000);
    }
    const token = await ethers.getContractAt("TalentTokenV3Migration", item);

    console.log("Migrating factory for:", item);

    const talent = await factory.tokensToTalents(item);

    maxFee = Math.ceil(response.data.standard.maxFee * 1.1);
    maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
    const emitTalentCreatedEvent = await factory.emitTalentCreatedEvent(talent, item, {
      maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
      maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
    });
    await emitTalentCreatedEvent.wait();

    const emitTransferEvent = await factory.emitTransferEvent(talent, item, {
      maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
      maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
    });
    await emitTransferEvent.wait();

    console.log(`${tokensIndex} done out of ${tokensTotal}`);
    tokensIndex += 1;
  }
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });

// const maxSForTalent = await staking.maxSForTalent(item);

// if (maxSForTalent > 0) {
//   const feeData = await provider.getFeeData();
//   const talentRewards = await staking.talentRedeemableRewards(item);
//   const tx = await staking.connect(owner).setTalentState(item, talentRewards, 0, {
//     maxFeePerGas: feeData.maxFeePerGas,
//   });
//   await tx.wait();
//   await sleep(5000);
// }
