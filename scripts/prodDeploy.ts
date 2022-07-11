import { ethers, network, upgrades, waffle } from "hardhat";
import * as StakingArtifact from "../artifacts/contracts/Staking.sol/Staking.json";
import * as StakingMigrationArtifact from "../artifacts/contracts/StakingMigration.sol/StakingMigration.json";
import dayjs from "dayjs";
import type { TalentFactory, Staking, StakingMigration } from "../typechain";

const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  const provider =  new ethers.providers.JsonRpcProvider("https://forno.celo.org");

  const oldStaking = new ethers.Contract(
    "0x8ea91a982d93836415CE3abbaf12d59fb8cE3Ff8",
    StakingArtifact.abi,
    owner
  );

  const newStaking = new ethers.Contract(
    "0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636",
    StakingMigrationArtifact.abi,
    owner
  );

  const allTX: any = [];

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
      // console.log("Emitting a Stake event");
      for await (const item of stakeLogs) {
        // console.log("Stake event: ", `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${item?.args[3]}`);
        await newStaking.connect(owner).emitStakeEvent(item?.args[0], item?.args[1], item?.args[2], item?.args[3]);
        stakeEventsEmmited += 1;
        txStakeEventsEmmited += 1;
      }
    }

    // Filter Rewards claim events
    const rewardClaimLogs = logs.filter(item => !!item && item.name === "RewardClaim");

    if (rewardClaimLogs.length > 0) {
      for await (const item of rewardClaimLogs) {
        // console.log("Reward claim event: ", `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${item?.args[3]}`);
        await newStaking.connect(owner).emitRewardsClaimEvent(item?.args[0], item?.args[1], item?.args[2], item?.args[3]);
        rewardsClaimEmmited += 1;
        txRewardsClaimEmmited += 1;
      }
    }

    console.log(`Migrated Transaction (${txIndex}/${txTotal}) - StakeEvents emmited: ${stakeEventsEmmited} - RewardsClaimed emmited: ${rewardsClaimEmmited}`);
    txIndex += 1;
  }
  console.log("done.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
