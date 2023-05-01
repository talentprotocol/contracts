import { ethers, upgrades, waffle, network, artifacts } from "hardhat";

import fs from "fs";
import path from "path";

import { HttpNetworkConfig } from "hardhat/types";
import { celoTokens, polygonTokens, alfajoresTransactions, alfajoresPairs, alfajoresTokens } from "../utils";
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

  switch (network.name) {
    case "celo":
      oldStakingAddr = "0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636";
      stakingAddr = "0x3756AeF98175B95EdcEF4fD7D4dF4264D349Ee09";
      tokens = tokens.concat(celoTokens);

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
      stakingAddr = "0x9A9f14728342498A776746627de677536850C039";
      tokens = tokens.concat(polygonTokens);

      break;

    case "alfajores":
      oldStakingAddr = "0xfc35754091D1540cE605Db87e5284369D766F0bF";
      stakingAddr = "0xD97569124CD3fDB976777a9658803A10c6e81811";
      factoryAddr = "0x9C6cD4cd004502c8889cdfEc8D4Fa32eaAD6BC98";
      rewardCalculatorAddr = "0xC2bdf9900947FD2b135602B4811FB9AD107285eC";
      virtualTALAddr = "0x74e9ACa3cDaD0792f5564FBeAC71A8Bc75A7C0A6";
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

  // console.log("Migrating generic variables");

  // const setAccumulatedState = await staking.setAccumulatedState(
  //   await oldStaking.activeStakes(),
  //   await oldStaking.totalStableStored(),
  //   await oldStaking.totalTokensStaked(),
  //   await oldStaking.rewardsGiven()
  // );
  // await setAccumulatedState.wait();

  // const setRealtimeState = await staking.setRealtimeState(
  //   await oldStaking.S(),
  //   await oldStaking.SAt(),
  //   await oldStaking.totalAdjustedShares()
  // );
  // await setRealtimeState.wait();
  // console.log("Done.");

  let txStakeEventsEmmited = 0;
  let txRewardsClaimEmmited = 0;
  let txIndex = 0;
  let pairs: string[] = [];
  const contractsDir = path.join(__dirname, "..", "transactions");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  // for await (const tx of transactions) {
  //   console.log("Running TX: ", tx);
  //   const transaction = await provider.getTransactionReceipt(tx);
  //   const timestamp = (await provider.getBlock(transaction.blockNumber)).timestamp;

  //   const logs = transaction.logs.map((log: any) => {
  //     try {
  //       return staking.interface.parseLog(log);
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

  //   if (stakeLogs.length > 0) {
  //     for await (const item of stakeLogs) {
  //       console.log(
  //         "Stake event: ",
  //         `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${timestamp}, ${isFirstStake}`
  //       );
  //       pairs.push(`${item?.args[0]}-${item?.args[1]}`);

  //       if (pairs.filter((pair) => pair == `${item?.args[0]}-${item?.args[1]}`).length > 1) {
  //         console.log("skipping tx");
  //         continue;
  //       }

  //       fs.appendFileSync(
  //         path.join(contractsDir, "transactions-one-by-one.json"),
  //         `"${item?.args[0]}-${item?.args[1]}",\n`
  //       );

  //       if (isFirstStake) {
  //         const setFirstPurchaseTimestamp = await staking.setFirstPurchaseTimestamp(
  //           item?.args[0],
  //           item?.args[1],
  //           timestamp
  //         );
  //         await setFirstPurchaseTimestamp.wait();
  //       }

  //       const oldStake = await oldStaking.stakes(item?.args[0], item?.args[1]);

  //       const transferStake = await staking.transferStake(item?.args[0], item?.args[1], oldStake);
  //       await transferStake.wait();

  //       const emitStakeEvent = await staking.emitStakeEvent(item?.args[0], item?.args[1], item?.args[2], item?.args[3]);
  //       await emitStakeEvent.wait();

  //       txStakeEventsEmmited += 1;
  //     }
  //   }

  //   txIndex += 1;

  //   console.log(
  //     `Migrated OLD events: ${txIndex} of ${transactions.length} - StakeEvents emmited: ${txStakeEventsEmmited} - RewardsClaimed emmited: ${txRewardsClaimEmmited}`
  //   );
  // }

  let allTalentRewards = BigNumber.from("4749343120002334619647509");
  let tokenIndex = 0;

  const mul = await rewardCalculator.mul();
  // const talentS = await staking.talentS();

  // for await (const token of tokens) {
  //   const talentRedeemableRewards = await oldStaking.talentRedeemableRewards(token);

  //   allTalentRewards = talentRedeemableRewards.add(allTalentRewards);

  //   tokenIndex += 1;
  //   console.log(`done token ${tokenIndex} of ${tokens.length}`);
  // }

  // const setGlobalClaimRewards = await staking.setGlobalClaimRewards(allTalentRewards.mul(mul));
  // await setGlobalClaimRewards.wait();

  // return;

  tokenIndex = 0;
  const talentS = await staking.talentS();
  console.log("talentS:", talentS);
  const totalTokensStaked = await staking.totalTokensStaked();
  // for await (const token of tokens) {
  //   const talentRedeemableRewards = await oldStaking.talentRedeemableRewards(token);
  //   const setClaimRewards = await staking.setClaimRewards(token, talentRedeemableRewards);
  //   await setClaimRewards.wait();

  //   tokenIndex += 1;
  //   console.log(`done token ${tokenIndex} of ${tokens.length}`);
  // }

  // return;

  for await (const pair of alfajoresPairs) {
    const pairArr = pair.split("-");
    // TODO: adicionar vTAL a partir do globalS -> vários stakes vão ter S abaixo do globalS
    // calcular essa diferença, quantos rewards perderam e creditar em vTAL
    const globalStake = await staking.globalStakes(pairArr[0]);
    const oldStake = await oldStaking.stakes(pairArr[0], pairArr[1]);

    if (globalStake.S > oldStake.S) {
      console.log("migration pair:", pair);
      console.log("globalStake.S:", globalStake.S);
      console.log("oldStake.S:", oldStake.S);
      const [stakerRewards, talentRewards] = await rewardCalculator.calculateReward(
        oldStake.tokenAmount,
        oldStake.S,
        globalStake.S,
        await staking.totalSupporterTALInvested(),
        await staking.totalTalentTALInvested()
      );

      if (stakerRewards > 0) {
        await virtualTAL.adminMint(pairArr[0], stakerRewards);
      }

      if (talentRewards > 0) {
        const owner = await factory.tokensToTalents(pairArr[1]);
        await virtualTAL.adminMint(owner, talentRewards);
      }
    }
  }

  console.log("totalTALInvested:", await staking.totalTALInvested());
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
