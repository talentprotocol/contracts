import { ethers, upgrades, waffle, network } from "hardhat";

import axios from "axios";

import { RewardCalculatorV2, StakingV3State, TalentFactoryV3Migration, VirtualTAL } from "../../typechain-types";
import { HttpNetworkConfig } from "hardhat/types";
import { celoTokens, polygonTokens, alfajoresTokens } from "../utils";

const { parseUnits, formatUnits } = ethers.utils;
const { exit } = process;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);

  const networkConfig = network.config as HttpNetworkConfig;
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.url);

  console.log("network", network.name);

  let oldStakingAddr = "";
  let oldFactoryAddr = "";
  let stakingAddr = "";
  let factoryAddr = "";
  let rewardCalculatorAddr = "";
  let virtualTALAddr = "";
  let tokens: string[] = [];

  switch (network.name) {
    case "celo":
      oldStakingAddr = "0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636";
      oldFactoryAddr = "0xa902DA7a40a671B84bA3Dd0BdBA6FD9d2D888246";
      stakingAddr = "0x4C9ca5956C4E39ac489081F8b0d85e987c55dB08";
      factoryAddr = "0xE072455F02Ed15bdEEB95165FF4200a8b0C72E1A";
      rewardCalculatorAddr = "0x73F8b7D42Be569F1f5A3D9218E3adEAAbBA00D94";
      virtualTALAddr = "0xD57f6f45dfbB14d0Af64e0B236e1734924A933eb";
      tokens = tokens.concat(celoTokens);

      break;
    case "polygon":
      oldStakingAddr = "0xEa998Ff9c0c075cD035b25095D1833E5aF0aF873";
      oldFactoryAddr = "0xA91b75E8aA2Dc62B2957333B1a1412532444FdE0";
      stakingAddr = "0xFa236a656A8FBD82801Fe5bA7b127FBbC4B0ed11";
      factoryAddr = "0x7cc5182F85e316E0AafF86797D59Eb79A776Fabe";
      rewardCalculatorAddr = "0xE2B3B893315b966efC2Ef04102C200bb570ec063";
      virtualTALAddr = "0x094dDe6B94c04aF7FF67d62d631b4071cB8618A4";
      tokens = tokens.concat(polygonTokens);

      break;

    case "alfajores":
      oldStakingAddr = "0xfc35754091D1540cE605Db87e5284369D766F0bF";
      oldFactoryAddr = "0x8ee4f3044Ef0166A6DB12b0e9Eeb1735f1Fc7cc9";
      stakingAddr = "0x0af4603de5F98f6C5ba6cCbc1Facf04942E10084";
      factoryAddr = "0xd15Dbc6b4BeA37f7A134B78092EB418e45FcD2A9";
      rewardCalculatorAddr = "0xF45dF4B2290BC5ec69e2aA4cF7E9a62dA5233964";
      virtualTALAddr = "0x16c7a679170A7c7F630d98c932Da2646B408144c";
      tokens = tokens.concat(alfajoresTokens);

      break;

    case "mumbai":
      oldStakingAddr = "0x3678cE749b0ffa5C62dd9b300148259d2DFAE572";
      oldFactoryAddr = "0x228D74bCf10b9ad89600E70DE265653C9Da1B514";
      stakingAddr = "0x38D0760d77A42740183e5C4DA876B6493DC53272";
      factoryAddr = "0x6633d99c035AFb90b073A57EE06F9E46e06D3f88";
      rewardCalculatorAddr = "0x81d149c23097c6F32ee154E666B45DE1E0aB98fb";
      virtualTALAddr = "0xB8630837Dd13E86aB7ee7094a5C7e2868efe7e54";

      break;
    default:
      break;
  }

  const oldStaking = await ethers.getContractAt("StakingMigration", oldStakingAddr);
  const staking = await ethers.getContractAt("StakingV3Migration", stakingAddr);
  const factory = await ethers.getContractAt("TalentFactoryV3Migration", factoryAddr);
  const oldFactory = await ethers.getContractAt("TalentFactoryV2", oldFactoryAddr);
  const rewardCalculator = await ethers.getContractAt("RewardCalculatorV2", rewardCalculatorAddr);
  const virtualTAL = await ethers.getContractAt("VirtualTAL", virtualTALAddr);

  let index = 0;

  let options = {};

  if (network.name == "polygon") {
    const response = await axios.get("https://gasstation.polygon.technology/v2");
    const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
    const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
    options = {
      maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
      maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
    };
  }

  // const implementationBeacon = await oldFactory.implementationBeacon();

  // const TalentTokenV3Migration = await ethers.getContractFactory("TalentTokenV3Migration");
  // await upgrades.validateUpgrade(implementationBeacon, TalentTokenV3Migration);

  // console.log("upgrading beacon to TalentTokenV3Migration");
  // const beacon = await upgrades.upgradeBeacon(implementationBeacon, TalentTokenV3Migration);
  // await beacon.deployed();
  // console.log("done");

  // console.log("beacon address:", beacon.address);
  // console.log("beacon implementation address:", await upgrades.beacon.getImplementationAddress(implementationBeacon));

  // const tx = await factory.migrateImplementationBeacon(implementationBeacon, options);
  // await tx.wait();

  // await virtualTAL.adminMint(owner.address, 1000000);
  // await virtualTAL.adminMint("0xdc7d1e0122f6a38735a938789f67b38f43fefad7", 1000000);
  // await virtualTAL.adminMint("0xf9342d70a2a6eb46afd7b81138dee01d73b2e419", 1000000);
  // await virtualTAL.adminMint("0x1b4bc684f893e4617cd776575c73ea85ba7facf1", 1000000);
  // await virtualTAL.adminMint("0x3a1e6b8a381c15bc49da9b936a7a25b743e9893b", 1000000);
  // await virtualTAL.adminMint("0x0914543c9716d8a4811187a78606a50ca81b9c14", 1000000);
  // await virtualTAL.adminMint("0x6942f1418bef7eea0b9d2ddd78f0334fbedfe167", 1000000);
  // await virtualTAL.adminMint("0xd896b075f1c22c867d9747f33df5631bc01c15aa", 1000000);
  // await virtualTAL.adminMint("0x3b91036a4b6693e4373c5416e20e3b209d5a9662", 1000000);
  // await virtualTAL.adminMint("0x6d1003099cb2cbabc5e25e0f738a19b37b111c97", 1000000);
  // await virtualTAL.adminMint("0x6d8aa0d4e794f63eba0ad618c42e059866cc6311", 1000000);
  // await virtualTAL.adminMint("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", 1000000);
  // await virtualTAL.adminMint("0x14dde18f055e2570454b4f2dc1c3fdd2c8ec86d7", 1000000);
  // await virtualTAL.adminMint("0xd21a92998c1aa74a7636d9eed70c46fbe4214f49", 1000000);
  // await virtualTAL.adminMint("0x257a049ec15cbe1d37710ce82dc7ee1f36947d5b", 1000000);
  // await virtualTAL.adminMint("0xf9bb10f122722ccf86767490f33dd74dd0b9c5f2", 1000000);
  // await virtualTAL.adminMint("0x652b551e03d4a25c159e0f8e00e7de78b8917e3a", 1000000);
  // await virtualTAL.adminMint("0x903f03c84808f37d9f243c6b16876281936e043f", 1000000);
  // await virtualTAL.adminMint("0xce4c7802719ef4b0039667183de79f1d691c4c73", 1000000);
  // await virtualTAL.adminMint("0x70ebe9e67b1b2c5ba35aa45d98730603b4e24f5d", 1000000);
  // await virtualTAL.adminMint("0x33041027dd8f4dc82b6e825fb37adf8f15d44053", 1000000);
  // await virtualTAL.adminMint("0xc8b74c37bd25e6ca8cb6ddf2e01058c45d341182", 1000000);
  // await virtualTAL.adminMint("0xa983d28eaa416a775f654de628a05b7805cafeea", 1000000);
  // await virtualTAL.adminMint("0xad3879546e90e7ab0200ead76ef0b35c4691d545", 1000000);
  // await virtualTAL.adminMint("0xeea6c4d388442ec61f6c8f43f20742fe4457700f", 1000000);
  // await virtualTAL.adminMint("0x58a35cf59d5c630c057af008a78bc67cdc2ec094", 1000000);
  // await virtualTAL.adminMint("0x9eb896c28ea9616b96bb4d42ad01e990f1486cb3", 1000000);
  // await virtualTAL.adminMint("0xa081e1da16133bb4ebc7aab1a9b0588a48d15138", 1000000);

  // const mul = await rewardCalculator.mul();
  // const talentS = await staking.talentS();
  let nonce = 16663;

  // const token = await ethers.getContractAt("TalentTokenV3Migration", "0xf942f5f6a484d5a2aec915dc133e439f1aa5f2cb");

  // const totalSupply = await token.totalSupply();
  // const talentRedeemableRewards = await oldStaking.talentRedeemableRewards(
  //   "0xf942f5f6a484d5a2aec915dc133e439f1aa5f2cb"
  // );
  // const talentS = await staking.talentS();

  // console.log("totalSupply:", formatUnits(totalSupply));
  // console.log("talentRedeemableRewards:", formatUnits(talentRedeemableRewards));
  // console.log("talentS:", formatUnits(talentS));

  // return;

  let count = ethers.BigNumber.from("0");

  for await (const item of tokens) {
    console.log("migrating token:", item);
    const token = await ethers.getContractAt("TalentTokenV3Migration", item);
    const feeData = await provider.getFeeData();

    const talentRedeemableRewards = await oldStaking.talentRedeemableRewards(item);

    console.log("talentRedeemableRewards:", talentRedeemableRewards);
    count = count.add(talentRedeemableRewards);

    const talent = await oldFactory.tokensToTalents(item);
    const symbol = await token.symbol();
    let options = {};

    if (network.name == "polygon") {
      nonce += 1;
      const response = await axios.get("https://gasstation.polygon.technology/v2");
      const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
      const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
      options = {
        maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
        maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
        nonce: nonce,
      };
    } else {
      options = {
        maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
      };
    }

    const migrateMappings = await factory.migrateMappings(item, talent, symbol, options);
    // await migrateMappings.wait();
    if (network.name == "polygon") {
      nonce += 1;
      const response = await axios.get("https://gasstation.polygon.technology/v2");
      const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
      const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
      options = {
        maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
        maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
        nonce: nonce,
      };
    } else {
      options = {
        maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
      };
    }

    const emitTalentCreatedEvent = await factory.emitTalentCreatedEvent(talent, item, options);
    // await emitTalentCreatedEvent.wait();
    if (network.name == "polygon") {
      nonce += 1;
      const response = await axios.get("https://gasstation.polygon.technology/v2");
      const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
      const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
      options = {
        maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
        maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
        nonce: nonce,
      };
    } else {
      options = {
        maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
      };
    }

    const maxSupply = await token.MAX_SUPPLY();
    const totalSupply = await token.totalSupply();
    const mintingAvailability = maxSupply.sub(totalSupply);

    const transferState = await token.transferState(talent, factory.address, mintingAvailability, options);
    // await transferState.wait();
    if (network.name == "polygon") {
      nonce += 1;
      const response = await axios.get("https://gasstation.polygon.technology/v2");
      const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
      const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
      options = {
        maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
        maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
        nonce: nonce,
      };
    } else {
      options = {
        maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
      };
    }

    const addNewMinter = await token.addNewMinter(stakingAddr, options);
    // await addNewMinter.wait();
    // if (network.name == "polygon") {
    //   nonce += 1;
    //   const response = await axios.get("https://gasstation.polygon.technology/v2");
    //   const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
    //   const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
    //   options = {
    //     maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
    //     maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
    //     nonce: nonce,
    //   };
    // } else {
    //   options = {
    //     maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
    //     maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
    //   };
    // }

    // const removeMinter = await token.removeMinter(oldStakingAddr, options);
    // await removeMinter.wait();

    index += 1;

    console.log(`migrated ${index} of ${tokens.length}`);
  }

  console.log("count", formatUnits(count));
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
