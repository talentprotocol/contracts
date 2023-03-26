import { ethers, upgrades, waffle, network } from "hardhat";

import * as TalentTokenArtifactV2 from "../../artifacts/contracts/test/TalentTokenV2.sol/TalentTokenV2.json";
import * as TalentTokenV3 from "../../artifacts/contracts/season3/TalentTokenV3.sol/TalentTokenV3.json";
import { StakingMigrationV2__factory, UpgradeableBeacon__factory } from "../../typechain-types";
import { HttpNetworkConfig } from "hardhat/types";
import { celoTokens, polygonTokens, polygonTransactions, sleep } from "../utils";

const { parseUnits, formatUnits } = ethers.utils;
const { exit } = process;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);

  const networkConfig = network.config as HttpNetworkConfig;
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.url, "matic");

  console.log("network", network.name);

  let stakingAddr = "";
  let factoryAddr = "";
  let tokens: string[] = [];

  switch (network.name) {
    case "celo":
      stakingAddr = "0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636";
      factoryAddr = "0x8C92E5778E3b4BF3A7B2B7EB060854Bd2251A6F4";
      tokens = tokens.concat(celoTokens);

      break;
    case "polygon":
      stakingAddr = "0xE23104E89fF4c93A677136C4cBdFD2037B35BE67";
      factoryAddr = "0xA91b75E8aA2Dc62B2957333B1a1412532444FdE0";
      tokens = tokens.concat(polygonTokens);

      break;
    default:
      break;
  }

  const staking = await ethers.getContractAt("StakingMigrationV2", stakingAddr);
  const factory = await ethers.getContractAt("TalentFactoryV3", factoryAddr);
  const StakingMigrationV2 = (await ethers.getContractFactory("StakingMigrationV2")) as StakingMigrationV2__factory;

  let txIndex = 1;
  const txTotal = polygonTransactions.length;
  let txStakeEventsEmmited = 0;
  let txRewardsClaimEmmited = 0;

  const start = 1662971008;
  const end = 2925241200;

  // const tx = await staking.setInitialState(start, end, parseUnits("0.02"), parseUnits("5"), parseUnits("400000000"), {
  //   maxFeePerGas: feeData.maxFeePerGas,
  // });
  // await tx.wait();

  // sleep(5000);
  // const stakingStart = await staking.start();
  // console.log("start:", stakingStart);

  // const stakingEnd = await staking.end();
  // console.log("end:", stakingEnd);

  // const tokenPrice = await staking.tokenPrice();
  // console.log("tokenPrice:", tokenPrice);

  // const talentPrice = await staking.talentPrice();
  // console.log("talentPrice:", talentPrice);

  // const rewardsMax = await staking.rewardsMax();
  // console.log("rewardsMax:", rewardsMax);

  // const S = await staking.S();
  // console.log("S:", S);

  // const totalTokensStaked = await staking.totalTokensStaked();
  // console.log("totalTokensStaked:", totalTokensStaked);

  // const totalAdjustedShares = await staking.totalAdjustedShares();
  // console.log("totalAdjustedShares:", totalAdjustedShares);

  // const rewardsGiven = await staking.rewardsGiven();
  // console.log("rewardsGiven:", rewardsGiven);

  // const talentRedeemableRewards = await staking.talentRedeemableRewards("0x38bf37C8408BA39108344F0e466582C2b65B10DA");
  // console.log("talentRedeemableRewards:", talentRedeemableRewards);

  // const stakes = await staking.stakes(
  //   "0x33041027dd8F4dC82B6e825FB37ADf8f15d44053",
  //   "0x38bf37C8408BA39108344F0e466582C2b65B10DA"
  // );
  // console.log("stakes:", stakes);

  // let tokensIndex = 1;
  // const tokensTotal = tokens.length;

  // for await (const item of tokens) {
  //   const feeData = await provider.getFeeData();
  //   console.log("migrating token:", item);
  //   // const estimateGas = await staking.estimateGas.setTalentRedeemableRewards(item);

  //   const tx = await staking.setTalentRedeemableRewards(item, {
  //     gasPrice: feeData.gasPrice?.mul(120).div(100),
  //   });
  //   await tx.wait();

  //   console.log(`done (${tokensIndex}/${tokensTotal})`);
  //   tokensIndex += 1;
  // }

  for await (const tx of polygonTransactions) {
    // let response = await axios.get("https://gasstation-mainnet.matic.network/v2");
    // let estimatedBaseFee = response.data.estimatedBaseFee;
    // while (estimatedBaseFee > 300) {
    //   response = await axios.get("https://gasstation-mainnet.matic.network/v2");
    //   estimatedBaseFee = response.data.estimatedBaseFee;

    //   await sleep(10000);
    // }
    console.log("Running TX: ", tx);
    const transaction = await provider.getTransactionReceipt(tx);
    const timestamp = (await provider.getBlock(transaction.blockNumber)).timestamp;

    const logs = transaction.logs.map((log: any) => {
      try {
        return staking.interface.parseLog(log);
      } catch {
        return null;
      }
    });

    const stakeLogsCheck = logs.filter((item) => !!item && item.name === "Stake");
    const rewardClaimLogsCheck = logs.filter((item) => !!item && item.name === "RewardClaim");
    let isFirstStake = false;
    if (rewardClaimLogsCheck.length === 0 && stakeLogsCheck.length === 1) {
      isFirstStake = true;
    }
    // Filter STAKE events
    const stakeLogs = logs.filter((item) => !!item && item.name === "Stake");

    if (stakeLogs.length > 0) {
      for await (const item of stakeLogs) {
        console.log(
          "Stake event: ",
          `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${timestamp}, ${isFirstStake}`
        );
        // await staking.connect(owner).emitStakeEvent(item?.args[0], item?.args[1], item?.args[2], item?.args[3]);
        const feeData = await provider.getFeeData();
        const tx = await staking
          .connect(owner)
          .transferStake(item?.args[0], item?.args[1], item?.args[2], timestamp, isFirstStake, {
            gasPrice: feeData.gasPrice?.mul(120).div(100),
          });

        await tx.wait();
        // await sleep(5000);
        txStakeEventsEmmited += 1;
      }
    }

    // Filter Rewards claim events
    const rewardClaimLogs = logs.filter((item) => !!item && item.name === "RewardClaim");

    if (rewardClaimLogs.length > 0) {
      for await (const item of rewardClaimLogs) {
        console.log(
          "Reward claim event: ",
          `${item?.args[0]}, ${item?.args[1]}, ${timestamp}, ${item?.args[2]}, ${item?.args[3]}`
        );
        // await staking.connect(owner).emitRewardsClaimEvent(item?.args[0], item?.args[1], item?.args[2], item?.args[3]);
        const feeData = await provider.getFeeData();
        const tx = await staking
          .connect(owner)
          .setClaimRewards(item?.args[0], item?.args[1], timestamp, item?.args[2], item?.args[3], {
            gasPrice: feeData.gasPrice?.mul(120).div(100),
          });

        await tx.wait();
        // await sleep(5000);

        txRewardsClaimEmmited += 1;
      }
    }

    console.log(
      `Migrated Transaction (${txIndex}/${txTotal}) - StakeEvents emmited: ${txStakeEventsEmmited} - RewardsClaimed emmited: ${txRewardsClaimEmmited}`
    );
    txIndex += 1;
  }
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
