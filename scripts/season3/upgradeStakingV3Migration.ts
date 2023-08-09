import { ethers, upgrades, waffle, network, artifacts } from "hardhat";

import fs from "fs";
import path from "path";
import axios from "axios";

import { HttpNetworkConfig } from "hardhat/types";
import {
  celoTokens,
  celoTransactions,
  polygonTokens,
  newPolygonTransactions,
  polygonPairs,
  alfajoresTransactions,
  alfajoresTokens,
  alfajoresPairs,
  celoPairs,
} from "../utils";
import { BigNumber } from "ethers";

const { parseUnits, formatUnits, parseEther } = ethers.utils;
const { exit } = process;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);

  const networkConfig = network.config as HttpNetworkConfig;
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.url);
  const originalBlockFormatter = provider.formatter._block;

  console.log("network", network.name);

  let oldStakingAddr = "";
  let stakingAddr = "";
  let rewardCalculatorAddr = "";
  let factoryAddr = "";
  let virtualTALAddr = "";
  let tokens: string[] = [];
  let transactions: string[] = [];
  let pairs: string[] = [];

  enum MintReason {
    TalentRedeemableRewards,
    TalentRewards,
    SupporterRewards,
    TalentTokensSold,
    InAppRewards,
    Investor,
  }

  switch (network.name) {
    case "celo":
      oldStakingAddr = "0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636";
      stakingAddr = "0x4C9ca5956C4E39ac489081F8b0d85e987c55dB08";
      factoryAddr = "0xE072455F02Ed15bdEEB95165FF4200a8b0C72E1A";
      rewardCalculatorAddr = "0x73F8b7D42Be569F1f5A3D9218E3adEAAbBA00D94";
      virtualTALAddr = "0xD57f6f45dfbB14d0Af64e0B236e1734924A933eb";
      transactions = transactions.concat(celoTransactions);
      tokens = tokens.concat(celoTokens);
      pairs = pairs.concat(celoPairs);

      provider.formatter._block = (value, format) => {
        return originalBlockFormatter(
          {
            gasLimit: ethers.constants.Zero,
            ...value,
          },
          format
        );
      };

      break;
    case "polygon":
      oldStakingAddr = "0xEa998Ff9c0c075cD035b25095D1833E5aF0aF873";
      stakingAddr = "0xFa236a656A8FBD82801Fe5bA7b127FBbC4B0ed11";
      factoryAddr = "0x7cc5182F85e316E0AafF86797D59Eb79A776Fabe";
      rewardCalculatorAddr = "0xE2B3B893315b966efC2Ef04102C200bb570ec063";
      virtualTALAddr = "0x094dDe6B94c04aF7FF67d62d631b4071cB8618A4";
      tokens = tokens.concat(polygonTokens);
      transactions = transactions.concat(newPolygonTransactions);
      pairs = pairs.concat(polygonPairs);

      break;

    case "alfajores":
      oldStakingAddr = "0xfc35754091D1540cE605Db87e5284369D766F0bF";
      stakingAddr = "0x0af4603de5F98f6C5ba6cCbc1Facf04942E10084";
      factoryAddr = "0xd15Dbc6b4BeA37f7A134B78092EB418e45FcD2A9";
      rewardCalculatorAddr = "0xF45dF4B2290BC5ec69e2aA4cF7E9a62dA5233964";
      virtualTALAddr = "0x16c7a679170A7c7F630d98c932Da2646B408144c";
      transactions = transactions.concat(alfajoresTransactions);
      tokens = tokens.concat(alfajoresTokens);

      provider.formatter._block = (value, format) => {
        return originalBlockFormatter(
          {
            gasLimit: ethers.constants.Zero,
            ...value,
          },
          format
        );
      };

      break;

    case "mumbai":
      oldStakingAddr = "0x3678cE749b0ffa5C62dd9b300148259d2DFAE572";
      stakingAddr = "0x4C1A1DaaEc0a1660359F83D76571f4b000eC7DA6";

      break;
    default:
      break;
  }

  const oldStaking = await ethers.getContractAt("StakingMigration", oldStakingAddr);
  const staking = await ethers.getContractAt("StakingV3Migration", stakingAddr);
  const rewardCalculator = await ethers.getContractAt("RewardCalculatorV2", rewardCalculatorAddr);
  const factory = await ethers.getContractAt("TalentFactoryV3Migration", factoryAddr);
  const virtualTAL = await ethers.getContractAt("VirtualTAL", virtualTALAddr);

  const feeData = await provider.getFeeData();

  // let options = {};

  // if (network.name == "polygon") {
  //   const response = await axios.get("https://gasstation.polygon.technology/v2");
  //   const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
  //   const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
  //   options = {
  //     maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
  //     maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
  //   };
  // } else {
  //   options = {
  //     maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
  //     maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
  //   };
  // }

  // await factory.setWhitelister("0x923b6bFC8Cb0d9a57716a1340F7b86E8B678ECEa", options);
  // await factory.setWhitelister("0xa081e1da16133bb4ebc7aab1a9b0588a48d15138", options);
  // await factory.setWhitelister("0x543b1d7ef97d3eccc22f9a012f0302706b3581dd", options);
  // await factory.setWhitelister("0x58a35cf59d5c630c057af008a78bc67cdc2ec094", options);
  // await factory.setWhitelister("0x33041027dd8f4dc82b6e825fb37adf8f15d44053", options);
  // await factory.setWhitelister("0xd53ad0f949378395cc5ac228d59c931d99ac71fe", options);
  // await factory.setWhitelister("0xf9342d70a2a6eb46afd7b81138dee01d73b2e419", options);
  // await factory.setWhitelister("0x652b551e03d4a25c159e0f8e00e7de78b8917e3a", options);
  // await factory.setWhitelister("0xc8b74c37bd25e6ca8cb6ddf2e01058c45d341182", options);
  // await factory.setWhitelister("0xd21a92998c1aa74a7636d9eed70c46fbe4214f49", options);
  // await factory.setWhitelister("0xf924efc8830bfa1029fa0cd7a51901a5ec03de3d", options);
  // await factory.setWhitelister("0x3b91036a4b6693e4373c5416e20e3b209d5a9662", options);

  // console.log("Migrating generic variables");

  // const setAccumulatedState = await staking.setAccumulatedState(
  //   await oldStaking.activeStakes(),
  //   await oldStaking.totalStableStored(),
  //   await oldStaking.totalTokensStaked(),
  //   await oldStaking.rewardsGiven(),
  //   options
  // );
  // await setAccumulatedState.wait();

  // const setRealtimeState = await staking.setRealtimeState(
  //   await oldStaking.S(),
  //   await oldStaking.SAt(),
  //   await oldStaking.totalAdjustedShares(),
  //   0,
  //   options
  // );
  // await setRealtimeState.wait();
  // console.log("Generic variables migrated.");

  let txStakeEventsEmmited = 0;
  let txRewardsClaimEmmited = 0;
  let txIndex = 0;
  let nonce = 82338;
  let options = {};

  const transactionsDir = path.join(__dirname, "..", "transactions");

  if (!fs.existsSync(transactionsDir)) {
    fs.mkdirSync(transactionsDir);
  }

  // for await (const tx of transactions) {
  //   console.log("Running TX: ", tx);
  //   const transaction = await provider.getTransactionReceipt(tx);
  //   const timestamp = (await provider.getBlock(transaction.blockNumber)).timestamp;

  //   const logs = transaction.logs.map((log: any) => {
  //     try {
  //       return oldStaking.interface.parseLog(log);
  //     } catch {
  //       return null;
  //     }
  //   });

  //   const stakeLogs = logs.filter((item) => !!item && item.name === "Stake");
  //   const rewardClaimLogs = logs.filter((item) => !!item && item.name === "RewardClaim");
  //   let isFirstStake = false;
  //   if (rewardClaimLogs.length === 0 && stakeLogs.length === 1) {
  //     isFirstStake = true;
  //   }

  //   if (rewardClaimLogs.length > 0 && false) {
  //     for await (const item of rewardClaimLogs) {
  //       console.log("Reward claim event: ", `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${timestamp}`);

  //       if (pairs.filter((pair) => pair == `${item?.args[0]}-${item?.args[1]}`).length > 0) {
  //         continue;
  //       }

  //       pairs.push(`${item?.args[0]}-${item?.args[1]}`);

  //       const feeData = await provider.getFeeData();

  //       if (network.name == "polygon") {
  //         nonce += 1;
  //         const response = await axios.get("https://gasstation.polygon.technology/v2");
  //         const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
  //         const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
  //         options = {
  //           maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
  //           maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
  //           nonce: nonce,
  //         };
  //       } else {
  //         options = {
  //           maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
  //           maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
  //         };
  //       }

  //       const oldStake = await oldStaking.stakes(item?.args[0], item?.args[1]);
  //       const transferStake = await staking.transferStake(item?.args[0], item?.args[1], oldStake, options);
  //       // await transferStake.wait();

  //       txRewardsClaimEmmited += 1;
  //     }
  //   }

  //   if (stakeLogs.length > 0 && isFirstStake) {
  //     for await (const item of stakeLogs) {
  //       console.log(
  //         "Stake event: ",
  //         `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${timestamp}, ${isFirstStake}`
  //       );

  //       const feeData = await provider.getFeeData();

  //       if (network.name == "polygon") {
  //         nonce += 1;
  //         const response = await axios.get("https://gasstation.polygon.technology/v2");
  //         const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
  //         const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
  //         options = {
  //           maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
  //           maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
  //           nonce: nonce,
  //         };
  //       } else {
  //         options = {
  //           maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
  //           maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
  //         };
  //       }

  //       const emitStakeEvent = await staking.emitStakeEvent(
  //         item?.args[0],
  //         item?.args[1],
  //         item?.args[2],
  //         item?.args[3],
  //         options
  //       );
  //       await emitStakeEvent.wait();

  //       // if (pairs.filter((pair) => pair == `${item?.args[0]}-${item?.args[1]}`).length > 0) {
  //       //   continue;
  //       // }

  //       pairs.push(`${item?.args[0]}-${item?.args[1]}`);

  //       fs.appendFileSync(
  //         path.join(transactionsDir, `pairs-one-by-one-${network.name}.json`),
  //         `"${item?.args[0]}-${item?.args[1]}",\n`
  //       );

  //       if (isFirstStake) {
  //         if (network.name == "polygon") {
  //           nonce += 1;
  //           const response = await axios.get("https://gasstation.polygon.technology/v2");
  //           const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
  //           const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
  //           options = {
  //             maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
  //             maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
  //             nonce: nonce,
  //           };
  //         } else {
  //           options = {
  //             maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
  //             maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
  //           };
  //         }

  //         const setFirstPurchaseTimestamp = await staking.setFirstPurchaseTimestamp(
  //           item?.args[0],
  //           item?.args[1],
  //           timestamp,
  //           options
  //         );
  //         await setFirstPurchaseTimestamp.wait();
  //       }
  //       const oldStake = await oldStaking.stakes(item?.args[0], item?.args[1]);

  //       if (network.name == "polygon") {
  //         nonce += 1;
  //         const response = await axios.get("https://gasstation.polygon.technology/v2");
  //         const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
  //         const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
  //         options = {
  //           maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
  //           maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
  //           nonce: nonce,
  //         };
  //       } else {
  //         options = {
  //           maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
  //           maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
  //         };
  //       }

  //       const transferStake = await staking.transferStake(item?.args[0], item?.args[1], oldStake, options);
  //       await transferStake.wait();

  //       txStakeEventsEmmited += 1;
  //     }
  //   }

  //   txIndex += 1;

  //   console.log(
  //     `Migrated OLD events: ${txIndex} of ${transactions.length} - StakeEvents emmited: ${txStakeEventsEmmited} - RewardsClaimed emmited: ${txRewardsClaimEmmited}`
  //   );
  // }

  let tokenIndex = 0;

  // for await (const token of tokens) {
  //   const talentRedeemableRewards = await oldStaking.talentRedeemableRewards(token);
  //   const owner = await factory.tokensToTalents(token);
  //   console.log("minting vTAL for:", token, "; owner:", owner);

  //   const feeData = await provider.getFeeData();

  //   if (network.name == "polygon") {
  //     nonce += 1;
  //     const response = await axios.get("https://gasstation.polygon.technology/v2");
  //     const maxFee = Math.ceil(response.data.standard.maxFee * 1.2);
  //     const maxPriorityFee = Math.ceil(response.data.standard.maxPriorityFee * 1.2);
  //     options = {
  //       maxFeePerGas: parseUnits(maxFee.toString(), "gwei"),
  //       maxPriorityFeePerGas: parseUnits(maxPriorityFee.toString(), "gwei"),
  //       nonce: nonce,
  //     };
  //   } else {
  //     options = {
  //       maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
  //       maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
  //     };
  //   }

  //   const adminMint = await virtualTAL.adminMint(
  //     owner,
  //     talentRedeemableRewards,
  //     MintReason.TalentRedeemableRewards,
  //     options
  //   );
  //   // await adminMint.wait();

  //   tokenIndex += 1;
  //   console.log(`done token ${tokenIndex} of ${tokens.length}`);
  // }

  let pairIndex = 0;

  const uniquePairs = [...new Set(pairs)];

  for await (const pair of uniquePairs) {
    console.log("pair:", pair);
    const pairArr = pair.split("-");

    const globalStake = await staking.globalStakes(pairArr[0]);
    const oldStake = await oldStaking.stakes(pairArr[0], pairArr[1]);

    if (globalStake.S > oldStake.S) {
      const [stakerRewards, talentRewards] = await rewardCalculator.calculateReward(
        oldStake.tokenAmount,
        oldStake.S,
        globalStake.S,
        await staking.totalSupporterTALInvested(),
        await staking.totalTalentTALInvested()
      );

      if (stakerRewards > 0) {
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
          nonce += 1;
          const feeData = await provider.getFeeData();

          options = {
            maxFeePerGas: feeData.maxFeePerGas?.mul(15).div(10),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(15).div(10),
            nonce: nonce,
          };
        }

        const adminMint = await virtualTAL.adminMint(pairArr[0], stakerRewards, MintReason.SupporterRewards, options);
        // await adminMint.wait();
      }

      if (talentRewards > 0) {
        const owner = await factory.tokensToTalents(pairArr[1]);

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
          nonce += 1;
          const feeData = await provider.getFeeData();

          options = {
            maxFeePerGas: feeData.maxFeePerGas?.mul(15).div(10),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(15).div(10),
            nonce: nonce,
          };
        }

        const adminMint = await virtualTAL.adminMint(owner, talentRewards, MintReason.TalentRewards, options);
        // await adminMint.wait();
      }
    }
    pairIndex += 1;
    console.log(`done pair number ${pairIndex} of ${uniquePairs.length}`);
  }

  console.log("totalTALInvested:", await staking.totalTALInvested());
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
