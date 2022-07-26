import { ethers, network, upgrades, waffle } from "hardhat";
import * as StakingArtifact from "../artifacts/contracts/Staking.sol/Staking.json";
import * as StakingMigrationArtifact from "../artifacts/contracts/StakingMigration.sol/StakingMigration.json";
import dayjs from "dayjs";
import type { TalentFactory, Staking, StakingMigration } from "../typechain-types";

const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  const provider =  new ethers.providers.JsonRpcProvider("https://alfajores-forno.celo-testnet.org");

  // const oldStaking = new ethers.Contract(
  //   "0xC0349e63C1250b408eA11F5492D70A8E5e202B93",
  //   StakingArtifact.abi,
  //   provider
  // )

  // const start = await oldStaking.start();
  // const end = await oldStaking.end();
  // const rewards = parseUnits("400000000");
  // const stableAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
  // const factoryAddress = "0x8ee4f3044Ef0166A6DB12b0e9Eeb1735f1Fc7cc9";

  // const StakingFactory = await ethers.getContractFactory("StakingMigration");
  // const newStaking = (await upgrades.deployProxy(StakingFactory, [
  //   start,
  //   end,
  //   rewards,
  //   stableAddress,
  //   factoryAddress,
  //   parseUnits("0.02"),
  //   parseUnits("5"),
  // ])) as StakingMigration;

  // const newStaking = (await deployContract(owner, StakingMigrationArtifact, [
  //   start,
  //   end,
  //   rewards,
  //   stableAddress,
  //   factoryAddress,
  //   parseUnits("0.02"),
  //   parseUnits("5"),
  // ])) as StakingMigration;

  const oldStaking = new ethers.Contract(
    "0xC0349e63C1250b408eA11F5492D70A8E5e202B93",
    StakingArtifact.abi,
    provider
  )

  const newStaking = new ethers.Contract(
    "0xfc35754091D1540cE605Db87e5284369D766F0bF",
    StakingMigrationArtifact.abi,
    provider
  )

  console.log("New Staking address: ", newStaking.address);

  console.log("Beginning migration");
  console.log("Migrating stake pairs");

  // const allStakes: any = [];

  // for await (const stakePair of allStakes) {
  //   const stakev1 = await oldStaking.stakes(stakePair.supporterWalletId, stakePair.talentContractId);

  //   await newStaking.connect(owner).transferStake(stakePair.supporterWalletId, stakePair.talentContractId, stakev1);
  //   console.log("Migrated a pair: ", `${stakePair.supporterWalletId} | ${stakePair.talentContractId}`);
  // }

  // const allTokens: any = [""];

  // console.log("-----------");
  // console.log("Migrating tokens");
  // for await (const token of allTokens) {
  //   const talentRewards = await oldStaking.talentRedeemableRewards(token);
  //   const maxTalentS = await oldStaking.maxSForTalent(token);

  //   await newStaking.connect(owner).setTalentState(token, talentRewards, maxTalentS);
  //   console.log("Migrated: ", token);
  // }

  // console.log("Migrating generic variables");

  // await newStaking.setAccumulatedState(
  //   await oldStaking.activeStakes(),
  //   await oldStaking.totalStableStored(),
  //   await oldStaking.totalTokensStaked(),
  //   await oldStaking.rewardsGiven(),
  // );

  // await newStaking.setRealtimeState(
  //   await oldStaking.S(),
  //   await oldStaking.SAt(),
  //   await oldStaking.totalAdjustedShares()
  // );

  // console.log("Done.");

  const allTX: any = []

  console.log("Processing events");

  let txIndex = 0;
  let stakeEventsEmmited = 0;
  let rewardsClaimEmmited = 0;
  let txStakeEventsEmmited = 0;
  let txRewardsClaimEmmited = 0;
  const txTotal = allTX.length;

  for (const tx of allTX) {
    txStakeEventsEmmited = 0;
    txRewardsClaimEmmited = 0;

    const transaction = await provider.getTransactionReceipt(tx);

    const logs = transaction.logs.map((log: any) => {
      try {
        return oldStaking.interface.parseLog(log)
      }  catch {
        return null;
      }
    });

    // Filter STAKE events
    const stakeLogs = logs.filter(item => !!item && item.name === "Stake");

    if (stakeLogs.length > 0) {
      console.log("Emitting a Stake event");
      for await (const item of stakeLogs) {
        console.log("Stake event: ", `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${item?.args[3]}`);
        await newStaking.connect(owner).emitStakeEvent(item?.args[0], item?.args[1], item?.args[2], item?.args[3]);
        stakeEventsEmmited += 1;
        txStakeEventsEmmited += 1;
      }
    }

    // Filter Rewards claim events
    const rewardClaimLogs = logs.filter(item => !!item && item.name === "RewardClaim");

    if (rewardClaimLogs.length > 0) {
      console.log("Emitting a reward claim event");
      for await (const item of rewardClaimLogs) {
        console.log("Reward claim event: ", `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${item?.args[3]}`);
        await newStaking.connect(owner).emitRewardsClaimEvent(item?.args[0], item?.args[1], item?.args[2], item?.args[3]);
        rewardsClaimEmmited += 1;
        txRewardsClaimEmmited += 1;
      }
    }

    console.log(`Migrated Transaction (${txIndex}/${txTotal}) - StakeEvents emmited: ${txStakeEventsEmmited} - RewardsClaimed emmited: ${txRewardsClaimEmmited}`);
    txIndex += 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
