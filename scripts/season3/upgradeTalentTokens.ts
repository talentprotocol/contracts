import { ethers, upgrades, waffle, network } from "hardhat";

import axios from "axios";

import * as TalentTokenArtifactV2 from "../../artifacts/contracts/test/TalentTokenV2.sol/TalentTokenV2.json";
import * as TalentTokenV3 from "../../artifacts/contracts/season3/TalentTokenV3.sol/TalentTokenV3.json";
import { UpgradeableBeacon__factory } from "../../typechain-types";
import { HttpNetworkConfig } from "hardhat/types";
import { celoTokens, polygonTokens, sleep } from "../utils";
import { parseUnits } from "ethers/lib/utils";

const { exit } = process;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);

  const networkConfig = network.config as HttpNetworkConfig;
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.url);

  console.log("network", network.name);

  let oldTalentFactoryAddr = "";
  let talentFactoryAddr = "";
  let stakingAddr = "";
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
      stakingAddr = "0xEa998Ff9c0c075cD035b25095D1833E5aF0aF873";
      beaconAddr = "0xE69328F9c542DB997deaE0A0dFDEe506b13df7B7";
      tokens = tokens.concat(polygonTokens);

      break;
    default:
      break;
  }

  const oldTalentFactory = await ethers.getContractAt("TalentFactory", oldTalentFactoryAddr);
  const factory = await ethers.getContractAt("TalentFactoryV3", talentFactoryAddr);

  let tokensIndex = 1;
  const tokensTotal = tokens.length;

  for await (const item of tokens) {
    // const feeData = await provider.getFeeData();

    const token = await ethers.getContractAt("TalentTokenV3Migration", item);

    console.log("Migrating token:", item);

    // const talent = await factory.tokensToTalents(item);
    // const maxSupply = await token.MAX_SUPPLY();
    // const totalSupply = await token.totalSupply();
    // const mintingAvailability = maxSupply.sub(totalSupply);

    // const realTalent = await token.talent();
    // const realMintingAvailability = await token.mintingAvailability();

    // console.log("talent", realTalent);
    // console.log("mintingAvailability", realMintingAvailability);

    // if (realTalent == ethers.constants.AddressZero) {
    //   const tx = await token.connect(owner).transferState(talent, oldTalentFactory.address, mintingAvailability, {
    //     maxFeePerGas: feeData.maxFeePerGas,
    //   });
    //   await tx.wait();
    //   await sleep(5000);
    // }
    const response = await axios.get("https://gasstation-mainnet.matic.network/v2");
    const maxFee = Math.ceil(response.data.standard.maxFee * 1.1);
    const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);

    const tx = await token.addNewMinter(stakingAddr, {
      maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
      maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
    });
    await tx.wait();
    const tx2 = await token.removeMinter("0xE23104E89fF4c93A677136C4cBdFD2037B35BE67", {
      maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
      maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
    });
    await tx2.wait();

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
