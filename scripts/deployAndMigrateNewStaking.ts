import { ethers, network, upgrades, waffle } from "hardhat";
import * as StakingArtifact from "../artifacts/contracts/Staking.sol/Staking.json";
import * as StakingMigrationArtifact from "../artifacts/contracts/StakingMigration.sol/StakingMigration.json";
import dayjs from "dayjs";
import type { TalentFactory, Staking, StakingMigration } from "../typechain";

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

  // const allStakes: any = [
  //   {
  //     supporterWalletId: "0x33041027dd8f4dc82b6e825fb37adf8f15d44053",
  //     talentContractId: "0xf942f5f6a484d5a2aec915dc133e439f1aa5f2cb"
  //   },
  //   {
  //     supporterWalletId: "0x14dde18f055e2570454b4f2dc1c3fdd2c8ec86d7",
  //     talentContractId: "0x5cabd4c99388234b0bf797428a1579254b9effd5"
  //   },
  //   {
  //     supporterWalletId: "0xdc7d1e0122f6a38735a938789f67b38f43fefad7",
  //     talentContractId: "0x5cabd4c99388234b0bf797428a1579254b9effd5"
  //   },
  //   {
  //     supporterWalletId: "0xf9bb10f122722ccf86767490f33dd74dd0b9c5f2",
  //     talentContractId: "0x5cabd4c99388234b0bf797428a1579254b9effd5"
  //   },
  //   {
  //     supporterWalletId: "0x33041027dd8f4dc82b6e825fb37adf8f15d44053",
  //     talentContractId: "0xbbc37ea38ec834ebf296fee21d059f0528eebdd3"
  //   },
  //   {
  //     supporterWalletId: "0xc8b74c37bd25e6ca8cb6ddf2e01058c45d341182",
  //     talentContractId: "0xbbc37ea38ec834ebf296fee21d059f0528eebdd3"
  //   },
  //   {
  //     supporterWalletId: "0x33041027dd8f4dc82b6e825fb37adf8f15d44053",
  //     talentContractId: "0xdbafa5dd56e582bb15805a7b665e5183e82459ca"
  //   },
  //   {
  //     supporterWalletId: "0x33041027dd8f4dc82b6e825fb37adf8f15d44053",
  //     talentContractId: "0x543766fc6ab468719ad69d8dc2134b127f56865a"
  //   },
  //   {
  //     supporterWalletId: "0xce4c7802719ef4b0039667183de79f1d691c4c73",
  //     talentContractId: "0x543766fc6ab468719ad69d8dc2134b127f56865a"
  //   },
  //   {
  //     supporterWalletId: "0x33041027dd8f4dc82b6e825fb37adf8f15d44053",
  //     talentContractId: "0x615170a6d049c037dad71c1d6fa190ac7f9d903e"
  //   },
  //   {
  //     supporterWalletId: "0x0914543c9716d8a4811187a78606a50ca81b9c14",
  //     talentContractId: "0xf942f5f6a484d5a2aec915dc133e439f1aa5f2cb"
  //   }];

  // for await (const stakePair of allStakes) {
  //   const stakev1 = await oldStaking.stakes(stakePair.supporterWalletId, stakePair.talentContractId);

  //   await newStaking.connect(owner).transferStake(stakePair.supporterWalletId, stakePair.talentContractId, stakev1);
  //   console.log("Migrated a pair: ", `${stakePair.supporterWalletId} | ${stakePair.talentContractId}`);
  // }

  // const allTokens: any = ["0xbbc37ea38ec834ebf296fee21d059f0528eebdd3","0x543766fc6ab468719ad69d8dc2134b127f56865a","0x615170a6d049c037dad71c1d6fa190ac7f9d903e","0xdbafa5dd56e582bb15805a7b665e5183e82459ca","0xf942f5f6a484d5a2aec915dc133e439f1aa5f2cb","0x9c377f7d83f3f3d1cebbb158a4691344f1f7e17a","0x6608e34fc60e3022111084dd5dea5cd2700745fc","0x08da06e515c801865d6be1008b014cb92141e394","0x5cabd4c99388234b0bf797428a1579254b9effd5","0x9954a7ff41da8ce2bda065d0d1e7096a89fb22a5","0x12bde07008bae57715a18ed7451cbef08c855266","0xecc48d4483109ecef307a300d8acb14893c4d311"];

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

  console.log("Done.");

  const currentTime = Date.now();

  const estimatedReturnsOld = await oldStaking.calculateEstimatedReturns("0x33041027dd8f4dc82b6e825fb37adf8f15d44053", "0x615170a6d049c037dad71c1d6fa190ac7f9d903e", currentTime);
  const estimatedReturnsNew = await newStaking.calculateEstimatedReturns("0x33041027dd8f4dc82b6e825fb37adf8f15d44053", "0x615170a6d049c037dad71c1d6fa190ac7f9d903e", currentTime);

  console.log("Old returns: ", estimatedReturnsOld.toString());
  console.log("New returns: ", estimatedReturnsNew.toString());

  const allTX = ["0x166cedc3eaf57ba43795701d9780f6c0403d6e8d4084467f046cd80763092eca","0x8e9d9fd6ed79f1ec672ddb28b122586692af8141bf3ce83ece664a75dd3a3e88","0x808427c516af8ecb99b5a591acb539b754e772b2986e2b7cb45c8f19dff1e54a","0x29a320f4e14dd293b41b3c19ee89533d4a075d42a258c53795f5d8c1bbda4d60","0x76f82c0474e4735492af6865ad0c34a60f2c2042c1f1dc1c12fc950449c23471","0xa994912706557d25478dbd316ba44c3c2b11b6a689b4868a886178a46790b39f","0xef70af87a57d8e7e358a3f8c6cb420366e1ce4074ffc93aff0270f77a9eca7a3","0x9a683f22c430554f1ae020edcbad15ff50067834122e2fbbb983d24898d4d08c","0xf6f473407f1470e0cce5dd8e905447319a4ebcb6138c6ac3041ab07ae1afd383","0xf593afd469c5e29cf27f6f3f70f4bf9f01d1c2d7746279d940c750d0066371e6","0xb4604065664f9133edb9822e5121b9e067faabc475c600219019ce0647c4252d","0x8029588e0dc67d611dcd5743aa0f76c1b6d272ca5d0f9d08145fda064508fe5d","0x45ba0b45c527f80b0300b8bb6ffbf1722f3b236e28ef644a65c84bb02d676b12","0xa3c47cb359b6422dd64e5552b2b7bd1d6c04696466e5c3b9c7e3bb5f36840d94","0x017ab28c83a1914c92bf410721f8734094abe122ff95a7ecd0e5320b8da9afcb"]

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
