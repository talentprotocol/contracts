import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, ContractReceipt } from "ethers";

import type {
  USDTMock,
  TalentToken,
  RewardCalculatorV2,
  VirtualTAL,
  Staking,
  StakingV3Migration,
  StakingV3,
  TalentFactoryV3Migration,
} from "../../../typechain-types";

import { ERC165, Artifacts } from "../../shared";
import { deployTalentToken, transferAndCall, ensureTimestamp, findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits, formatUnits } = ethers.utils;
const { deployContract } = waffle;

describe("StakingV3Migration", () => {
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let investor1: SignerWithAddress;

  let stable: USDTMock;
  let talentToken1: TalentToken;
  let talentToken2: TalentToken;
  let factory: TalentFactoryV3Migration;
  let staking: Staking;
  let stakingV3Migration: StakingV3Migration;
  let stakingV3: StakingV3;
  let virtualTAL: VirtualTAL;
  let rewardCalculatorV2: RewardCalculatorV2;

  let start = dayjs().add(1, "day").unix();
  let tenDaysLater = dayjs().add(10, "day").unix();
  let twentyDaysLater = dayjs().add(10, "day").unix();
  let end = dayjs.unix(start).add(100, "days").unix();
  const rewards = parseUnits("100");
  const margin = parseUnits("0.001") as unknown as number;

  enum MintReason {
    TalentRedeemableRewards,
    TalentRewards,
    SupporterRewards,
    TalentTokensSold,
    InAppRewards,
    Investor,
  }

  beforeEach(async () => {
    const lastBlock = await ethers.provider.getBlockNumber();
    const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;

    start = dayjs.unix(timestamp).add(1, "day").unix(); // one day later
    tenDaysLater = dayjs.unix(timestamp).add(10, "day").unix(); // ten days later
    twentyDaysLater = dayjs.unix(timestamp).add(20, "day").unix(); // 20 days later
    end = dayjs.unix(timestamp).add(100, "days").unix(); // 100 days later

    [owner, minter, talent1, talent2, investor1] = await ethers.getSigners();

    stable = (await deployContract(owner, Artifacts.USDTMock, [])) as USDTMock;

    await stable.connect(owner).transfer(investor1.address, parseUnits("10000"));
    await stable.connect(owner).transfer(talent1.address, parseUnits("10000"));
    await stable.connect(owner).transfer(talent2.address, parseUnits("10000"));

    // factory is deployed as a proxy already, to ensure `initialize` is called
    const FactoryFactory = await ethers.getContractFactory("TalentFactoryV3Migration");
    factory = (await upgrades.deployProxy(FactoryFactory, [])) as TalentFactoryV3Migration;
  });

  const virtualTALBuilder = async (): Promise<VirtualTAL> => {
    const VirtualTALContract = await ethers.getContractFactory("VirtualTAL");
    const virtualTAL = await upgrades.deployProxy(VirtualTALContract, []);
    await virtualTAL.deployed();

    return virtualTAL as VirtualTAL;
  };

  const rewardCalculatorV2Builder = async (): Promise<RewardCalculatorV2> => {
    const RewardCalculatorV2Contract = await ethers.getContractFactory("RewardCalculatorV2");
    const rewardCalculatorV2 = await upgrades.deployProxy(RewardCalculatorV2Contract, []);
    await rewardCalculatorV2.deployed();

    return rewardCalculatorV2 as RewardCalculatorV2;
  };

  const stakingBuilder = async (): Promise<Staking> => {
    const StakingContract = await ethers.getContractFactory("Staking");
    const staking = await upgrades.deployProxy(StakingContract, [
      start,
      end,
      rewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("5"),
    ]);
    await staking.deployed();

    return staking as Staking;
  };

  const stakingV3MigrationBuilder = async (): Promise<StakingV3Migration> => {
    const StakingV3State = await ethers.getContractFactory("StakingV3State");
    const stakingV3State = await upgrades.deployProxy(StakingV3State, [
      start,
      end,
      rewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("5"),
      rewardCalculatorV2.address,
      virtualTAL.address,
    ]);
    await stakingV3State.deployed();

    const StakingMigrationV3 = await ethers.getContractFactory("StakingV3Migration");
    const stakingV3Migration = await upgrades.upgradeProxy(stakingV3State, StakingMigrationV3);
    await stakingV3Migration.deployed();

    await factory.transferMinter(stakingV3Migration.address);
    await virtualTAL.setAdminRole(stakingV3Migration.address);

    return stakingV3Migration as StakingV3Migration;
  };

  const stakingV3Builder = async (): Promise<StakingV3> => {
    const StakingV3 = await ethers.getContractFactory("StakingV3");
    const stakingV3 = await upgrades.upgradeProxy(stakingV3Migration, StakingV3);
    await stakingV3.deployed();

    return stakingV3 as StakingV3;
  };

  describe("integration test", () => {
    beforeEach(async () => {
      const lastBlock = await ethers.provider.getBlockNumber();
      const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;
      start = dayjs.unix(timestamp).add(1, "day").unix(); // one day later

      virtualTAL = await virtualTALBuilder();
      rewardCalculatorV2 = await rewardCalculatorV2Builder();
      staking = await stakingBuilder();

      await factory.setMinter(staking.address);
      await factory.setWhitelister(minter.address);

      await factory.connect(minter).whitelistAddress(talent1.address);
      await factory.connect(minter).whitelistAddress(talent2.address);

      talentToken1 = await deployTalentToken(factory, minter, talent1, "Miguel Palhas", "NAPS");
      talentToken2 = await deployTalentToken(factory, minter, talent2, "Francisco Leal", "LEAL");

      await stable.connect(investor1).approve(staking.address, parseUnits("100"));
      await stable.connect(talent1).approve(staking.address, parseUnits("100"));
      await stable.connect(talent2).approve(staking.address, parseUnits("100"));

      await ensureTimestamp(start);
    });

    it("migrate talent rewards", async () => {
      let transactions = [];
      // stakes and claim rewards
      transactions.push(await staking.connect(talent1).stakeStable(talentToken1.address, parseUnits("10")));
      transactions.push(await staking.connect(talent1).stakeStable(talentToken2.address, parseUnits("10")));
      transactions.push(await staking.connect(talent2).stakeStable(talentToken1.address, parseUnits("10")));
      transactions.push(await staking.connect(talent2).stakeStable(talentToken2.address, parseUnits("10")));
      transactions.push(await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("10")));
      transactions.push(await staking.connect(investor1).stakeStable(talentToken2.address, parseUnits("10")));

      await ensureTimestamp(tenDaysLater);

      transactions.push(await staking.connect(talent1).claimRewards(talentToken1.address));
      transactions.push(await staking.connect(talent2).claimRewards(talentToken1.address));
      transactions.push(await staking.connect(investor1).claimRewards(talentToken1.address));

      await ensureTimestamp(twentyDaysLater);

      // upgrade Staking -> StakingV3Migration
      transactions.push(await staking.connect(talent1).claimRewards(talentToken1.address));
      transactions.push(await staking.connect(talent2).claimRewards(talentToken1.address));
      transactions.push(await staking.connect(investor1).claimRewards(talentToken1.address));

      stakingV3Migration = await stakingV3MigrationBuilder();

      // state migration
      const setAccumulatedState = await stakingV3Migration.setAccumulatedState(
        await staking.activeStakes(),
        await staking.totalStableStored(),
        await staking.totalTokensStaked(),
        await staking.rewardsGiven()
      );
      await setAccumulatedState.wait();

      const setRealtimeState = await stakingV3Migration.setRealtimeState(
        await staking.S(),
        await staking.SAt(),
        await staking.totalAdjustedShares(),
        0
      );
      await setRealtimeState.wait();

      let pairs = [];

      for await (const tx of transactions) {
        const receipt: ContractReceipt = await tx.wait();
        const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
        const events = receipt.events || [];

        const stakeLogs = events.filter((item) => !!item && item.event === "Stake");
        const rewardClaimLogs = events.filter((item) => !!item && item.event === "RewardClaim");
        let isFirstStake = false;
        if (rewardClaimLogs.length === 0 && stakeLogs.length === 1) {
          isFirstStake = true;
        }

        if (stakeLogs.length > 0) {
          for await (const event of stakeLogs) {
            if (pairs.filter((pair) => pair == `${event?.args?.owner}-${event.args?.talentToken}`).length > 0) {
              continue;
            }

            pairs.push(`${event?.args?.owner}-${event.args?.talentToken}`);

            if (isFirstStake) {
              const setFirstPurchaseTimestamp = await stakingV3Migration.setFirstPurchaseTimestamp(
                event?.args?.owner,
                event.args?.talentToken,
                timestamp
              );
              await setFirstPurchaseTimestamp.wait();
            }

            const oldStake = await staking.stakes(event?.args?.owner, event.args?.talentToken);

            const transferStake = await stakingV3Migration.transferStake(
              event?.args?.owner,
              event.args?.talentToken,
              oldStake
            );
            await transferStake.wait();

            const emitStakeEvent = await stakingV3Migration.emitStakeEvent(
              event?.args?.owner,
              event.args?.talentToken,
              event.args?.talAmount,
              event.args?.stable
            );
            await emitStakeEvent.wait();
          }
        }
      }

      const tokens = [talentToken1.address, talentToken2.address];

      for await (const token of tokens) {
        const talentRedeemableRewards = await staking.talentRedeemableRewards(token);
        const owner = await factory.tokensToTalents(token);

        const adminMint = await virtualTAL.adminMint(
          owner,
          talentRedeemableRewards,
          MintReason.TalentRedeemableRewards
        );
        await adminMint.wait();

        const virtualWalletBalance = await virtualTAL.getBalance(owner);
        expect(virtualWalletBalance).to.equal(talentRedeemableRewards);
      }

      for await (const pair of pairs) {
        const pairArr = pair.split("-");

        const globalStake = await stakingV3Migration.globalStakes(pairArr[0]);
        const oldStake = await staking.stakes(pairArr[0], pairArr[1]);

        if (globalStake.S > oldStake.S) {
          const [stakerRewards, talentRewards] = await rewardCalculatorV2.calculateReward(
            oldStake.tokenAmount,
            oldStake.S,
            globalStake.S,
            await stakingV3Migration.totalSupporterTALInvested(),
            await stakingV3Migration.totalTalentTALInvested()
          );
          const calculateEstimatedReturns = await staking.calculateEstimatedReturns(
            pairArr[0],
            pairArr[1],
            dayjs().unix()
          );

          if (stakerRewards.gte(0)) {
            await virtualTAL.adminMint(pairArr[0], stakerRewards, MintReason.SupporterRewards);
          }

          if (talentRewards.gte(0)) {
            const owner = await factory.tokensToTalents(pairArr[1]);
            await virtualTAL.adminMint(owner, talentRewards, MintReason.TalentRewards);
          }

          expect(stakerRewards.add(talentRewards)).to.be.closeTo(
            calculateEstimatedReturns.stakerRewards.add(calculateEstimatedReturns.talentRewards),
            margin
          );
        }
      }

      // upgrade StakingV3Migration -> StakingV3
      stakingV3 = await stakingV3Builder();

      // ----------------------------- checks -----------------------------

      // check token amounts
      const talent1TokenAmount = (await stakingV3.globalStakes(talent1.address)).tokenAmount;
      const talent1TalentToken1TokenAmount = (await staking.stakes(talent1.address, talentToken1.address)).tokenAmount;
      const talent1TalentToken2TokenAmount = (await staking.stakes(talent1.address, talentToken2.address)).tokenAmount;
      const talent1StakesSum = talent1TalentToken1TokenAmount.add(talent1TalentToken2TokenAmount);

      expect(talent1TokenAmount).to.equal(talent1StakesSum);

      const talent2TokenAmount = (await stakingV3.globalStakes(talent2.address)).tokenAmount;
      const talent2TalentToken1TokenAmount = (await staking.stakes(talent2.address, talentToken1.address)).tokenAmount;
      const talent2TalentToken2TokenAmount = (await staking.stakes(talent2.address, talentToken2.address)).tokenAmount;
      const talent2StakesSum = talent2TalentToken1TokenAmount.add(talent2TalentToken2TokenAmount);

      expect(talent2TokenAmount).to.equal(talent2StakesSum);

      const investor1TokenAmount = (await stakingV3.globalStakes(investor1.address)).tokenAmount;
      const investor1TalentToken1TokenAmount = (await staking.stakes(investor1.address, talentToken1.address))
        .tokenAmount;
      const investor1TalentToken2TokenAmount = (await staking.stakes(investor1.address, talentToken2.address))
        .tokenAmount;
      const investor1StakesSum = investor1TalentToken1TokenAmount.add(investor1TalentToken2TokenAmount);

      expect(investor1TokenAmount).to.equal(investor1StakesSum);

      // check talent rewards

      for await (const token of tokens) {
        const calculateTalentRewards = await stakingV3.calculateTalentRewards(token);

        expect(calculateTalentRewards).to.equal(0);
      }
    });
  });
});
