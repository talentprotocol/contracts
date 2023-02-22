import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import type {
  TalentProtocol,
  USDTMock,
  TalentFactoryV3,
  StakingV3,
  TalentToken,
  RewardCalculatorV2,
  VirtualTAL,
} from "../../../typechain-types";

import { ERC165, Artifacts } from "../../shared";
import { deployTalentToken, transferAndCall, ensureTimestamp, findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("StakingV3", () => {
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;

  let tal: TalentProtocol;
  let stable: USDTMock;
  let talentToken1: TalentToken;
  let talentToken2: TalentToken;
  let factory: TalentFactoryV3;
  let stakingV3: StakingV3;
  let virtualTAL: VirtualTAL;

  let start = dayjs().add(1, "day").unix();
  let end = dayjs.unix(start).add(100, "days").unix();
  const rewards = parseUnits("100");
  const margin = parseUnits("0.001") as unknown as number;

  beforeEach(async () => {
    const lastBlock = await ethers.provider.getBlockNumber();
    const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;

    start = dayjs.unix(timestamp).add(1, "day").unix(); // one minute later
    end = dayjs.unix(timestamp).add(100, "days").unix();

    [owner, minter, talent1, talent2, investor1, investor2] = await ethers.getSigners();

    stable = (await deployContract(owner, Artifacts.USDTMock, [])) as USDTMock;

    await stable.connect(owner).transfer(investor1.address, parseUnits("10000"));
    await stable.connect(owner).transfer(investor2.address, parseUnits("10000"));
    await stable.connect(owner).transfer(talent1.address, parseUnits("10000"));

    const TalentProtocolFactory = await ethers.getContractFactory("TalentProtocol");
    tal = (await upgrades.deployProxy(TalentProtocolFactory, [parseUnits("1000000000")])) as TalentProtocol;

    await tal.connect(owner).transfer(investor1.address, parseUnits("1000"));
    await tal.connect(owner).transfer(investor2.address, parseUnits("1000"));

    // factory is deployed as a proxy already, to ensure `initialize` is called
    const FactoryFactory = await ethers.getContractFactory("TalentFactoryV3");
    factory = (await upgrades.deployProxy(FactoryFactory, [])) as TalentFactoryV3;
  });

  describe("constructor", () => {
    it("works with valid arguments", async () => {
      const RewardCalculatorV2 = await ethers.getContractFactory("RewardCalculatorV2");
      const rewardCalculatorV2 = (await upgrades.deployProxy(RewardCalculatorV2, [])) as RewardCalculatorV2;

      const VirtualTALContract = await ethers.getContractFactory("VirtualTAL");
      const virtualTAL = await upgrades.deployProxy(VirtualTALContract, []);

      const StakingContract = await ethers.getContractFactory("StakingV3");
      const action = upgrades.deployProxy(StakingContract, [
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

      await expect(action).not.to.be.reverted;
    });

    it("fails if tokenPrice is 0", async () => {
      const RewardCalculatorV2 = await ethers.getContractFactory("RewardCalculatorV2");
      const rewardCalculatorV2 = (await upgrades.deployProxy(RewardCalculatorV2, [])) as RewardCalculatorV2;

      const VirtualTALContract = await ethers.getContractFactory("VirtualTAL");
      const virtualTAL = await upgrades.deployProxy(VirtualTALContract, []);

      const StakingContract = await ethers.getContractFactory("StakingV3");
      const action = upgrades.deployProxy(StakingContract, [
        start,
        end,
        rewards,
        stable.address,
        factory.address,
        parseUnits("0"),
        parseUnits("50"),
        rewardCalculatorV2.address,
        virtualTAL.address,
      ]);

      await expect(action).to.be.revertedWith("_tokenPrice cannot be 0");
    });

    it("fails if talentPrice is 0", async () => {
      const RewardCalculatorV2 = await ethers.getContractFactory("RewardCalculatorV2");
      const rewardCalculatorV2 = (await upgrades.deployProxy(RewardCalculatorV2, [])) as RewardCalculatorV2;

      const VirtualTALContract = await ethers.getContractFactory("VirtualTAL");
      const virtualTAL = await upgrades.deployProxy(VirtualTALContract, []);

      const StakingContract = await ethers.getContractFactory("StakingV3");
      const action = upgrades.deployProxy(StakingContract, [
        start,
        end,
        rewards,
        stable.address,
        factory.address,
        parseUnits("0.5"),
        parseUnits("0"),
        rewardCalculatorV2.address,
        virtualTAL.address,
      ]);

      await expect(action).to.be.revertedWith("_talentPrice cannot be 0");
    });

    it("fails if start is after end", async () => {
      const RewardCalculatorV2 = await ethers.getContractFactory("RewardCalculatorV2");
      const rewardCalculatorV2 = (await upgrades.deployProxy(RewardCalculatorV2, [])) as RewardCalculatorV2;

      const VirtualTALContract = await ethers.getContractFactory("VirtualTAL");
      const virtualTAL = await upgrades.deployProxy(VirtualTALContract, []);

      const StakingContract = await ethers.getContractFactory("StakingV3");
      const action = upgrades.deployProxy(StakingContract, [
        end,
        start,
        rewards,
        stable.address,
        factory.address,
        parseUnits("0.02"),
        parseUnits("5"),
        rewardCalculatorV2.address,
        virtualTAL.address,
      ]);

      await expect(action).to.be.revertedWith("start cannot be after end");
    });
  });

  const virtualTALBuilder = async (): Promise<VirtualTAL> => {
    const VirtualTALContract = await ethers.getContractFactory("VirtualTAL");
    const virtualTAL = await upgrades.deployProxy(VirtualTALContract, []);
    await virtualTAL.deployed();

    return virtualTAL as VirtualTAL;
  };

  const builder = async (): Promise<StakingV3> => {
    const RewardCalculatorContractV2 = await ethers.getContractFactory("RewardCalculatorV2");
    const rewardCalculatorV2 = (await upgrades.deployProxy(RewardCalculatorContractV2, [])) as RewardCalculatorV2;

    const StakingContract = await ethers.getContractFactory("StakingV3");
    const stakingV3 = await upgrades.deployProxy(StakingContract, [
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
    await stakingV3.deployed();

    return stakingV3 as StakingV3;
  };

  describe("behaviour", async () => {
    virtualTAL = await virtualTALBuilder();

    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IAccessControl"]);
  });

  describe("functions", () => {
    beforeEach(async () => {
      const lastBlock = await ethers.provider.getBlockNumber();
      const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;
      start = dayjs.unix(timestamp).add(1, "day").unix(); // one minute later

      virtualTAL = await virtualTALBuilder();
      stakingV3 = await builder();

      await factory.setMinter(stakingV3.address);
      await factory.setWhitelister(minter.address);

      await factory.connect(minter).whitelistAddress(talent1.address);
      await factory.connect(minter).whitelistAddress(talent2.address);

      talentToken1 = await deployTalentToken(factory, minter, talent1, "Miguel Palhas", "NAPS");
      talentToken2 = await deployTalentToken(factory, minter, talent2, "Francisco Leal", "LEAL");

      await virtualTAL.connect(owner).setAdminRole(stakingV3.address);

      await ensureTimestamp(start);
    });

    async function enterPhaseTwo() {
      await stakingV3.setToken(tal.address);
      await tal.connect(owner).transfer(stakingV3.address, rewards);
    }

    describe("stakeStable", () => {
      it("accepts stable coin stakes", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("25"));

        const investorStableBalanceBefore = await stable.balanceOf(investor1.address);
        const action = stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));

        await expect(action).not.to.be.reverted;

        // USDT is deducted
        expect(await stable.balanceOf(investor1.address)).to.eq(investorStableBalanceBefore.sub(parseUnits("25")));

        const talentBalance = await talentToken1.balanceOf(investor1.address);
        const expectedBalance = await stakingV3.convertUsdToTalent(parseUnits("25"));

        // NAPS is credited
        expect(talentBalance).to.equal(expectedBalance);
        expect(talentBalance).not.to.equal(parseUnits("0"));
      });

      it("accepts stable coin stakes with decimals", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("0.0099"));

        const investorStableBalanceBefore = await stable.balanceOf(investor1.address);
        const action = stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("0.0099"));

        await expect(action).not.to.be.reverted;

        // USDT is deducted
        expect(await stable.balanceOf(investor1.address)).to.eq(investorStableBalanceBefore.sub(parseUnits("0.0099")));

        const talentBalance = await talentToken1.balanceOf(investor1.address);
        const expectedBalance = await stakingV3.convertUsdToTalent(parseUnits("0.0099"));

        // NAPS is credited
        expect(talentBalance).to.equal(expectedBalance);
        expect(talentBalance).not.to.equal(parseUnits("0"));
      });

      it("creates a stake", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("25"));

        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));

        const stake = await stakingV3.stakes(investor1.address, talentToken1.address);

        expect(stake.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("25")));
      });

      it("emits the expected Stake event", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("1"));

        const action = stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));

        await expect(action)
          .to.emit(stakingV3, "Stake")
          .withArgs(investor1.address, talentToken1.address, parseUnits("50"), true);
      });

      it("updates totalTokensStaked", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("1"));
        await stable.connect(investor2).approve(stakingV3.address, parseUnits("1"));

        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));
        expect(await stakingV3.totalTokensStaked()).to.equal(parseUnits("50"));

        await stakingV3.connect(investor2).stakeStable(talentToken2.address, parseUnits("1"));
        expect(await stakingV3.totalTokensStaked()).to.equal(parseUnits("100"));
      });

      it("does not allow other accounts to set the token", async () => {
        const action = stakingV3.connect(investor1).setToken(tal.address);

        await expect(action).to.be.revertedWith(
          `AccessControl: account ${investor1.address.toLowerCase()} is missing role ${await stakingV3.DEFAULT_ADMIN_ROLE()}`
        );
      });

      it("does not accept stable coin stakes while in phase2", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("1"));
        await stakingV3.setToken(tal.address);

        const action = stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));

        await expect(action).to.be.revertedWith("Stable coin disabled");
      });

      it("updates totalStableStored", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("25"));
        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));

        expect(await stakingV3.totalStableStored()).to.eq(parseUnits("25"));
      });

      it("investor staking twice in the same talent goes through a checkpoint", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("50"));

        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));
        const stakeBefore = await stakingV3.stakes(investor1.address, talentToken1.address);
        const globalStakeBefore = await stakingV3.globalStakes(investor1.address);
        const virtualTALBalanceBefore = await virtualTAL.getBalance(investor1.address);

        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));
        const stakeAfter = await stakingV3.stakes(investor1.address, talentToken1.address);
        const globalStakeAfter = await stakingV3.globalStakes(investor1.address);
        const virtualTALBalanceAfter = await virtualTAL.getBalance(investor1.address);

        expect(stakeBefore.talentAmount).to.eq(parseUnits("250"));
        expect(stakeAfter.talentAmount).to.eq(parseUnits("500"));
        expect(globalStakeBefore.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("25")));
        expect(globalStakeAfter.tokenAmount).to.be.closeTo(await stakingV3.convertUsdToToken(parseUnits("50")), margin);
        expect(globalStakeAfter.lastCheckpointAt).to.be.gt(globalStakeBefore.lastCheckpointAt);
        expect(globalStakeBefore.talentS).to.equal(0);
        expect(globalStakeAfter.talentS).to.equal(0);
        expect(virtualTALBalanceBefore).to.equal(0);
        expect(virtualTALBalanceAfter).to.be.gt(0);
      });

      it("investor staking twice in different talents also goes through a checkpoint", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("50"));

        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("20"));
        const globalStakeBefore = await stakingV3.globalStakes(investor1.address);
        const virtualTALBalanceBefore = await virtualTAL.getBalance(investor1.address);

        await stakingV3.connect(investor1).stakeStable(talentToken2.address, parseUnits("30"));
        const stake1 = await stakingV3.stakes(investor1.address, talentToken1.address);
        const stake2 = await stakingV3.stakes(investor1.address, talentToken2.address);
        const globalStakeAfter = await stakingV3.globalStakes(investor1.address);
        const virtualTALBalanceAfter = await virtualTAL.getBalance(investor1.address);

        expect(stake1.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("20")));
        expect(stake1.talentAmount).to.equal(await stakingV3.convertUsdToTalent(parseUnits("20")));
        expect(stake2.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("30")));
        expect(stake2.talentAmount).to.equal(await stakingV3.convertUsdToTalent(parseUnits("30")));
        expect(globalStakeBefore.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("20")));
        expect(globalStakeAfter.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("50")));
        expect(globalStakeAfter.lastCheckpointAt).to.be.gt(globalStakeBefore.lastCheckpointAt);
        expect(globalStakeBefore.talentS).to.equal(0);
        expect(globalStakeAfter.talentS).to.equal(0);
        expect(virtualTALBalanceBefore).to.equal(0);
        expect(virtualTALBalanceAfter).to.be.gt(0);
      });

      it("talent staking twice in the same talent goes through a checkpoint", async () => {
        await stable.connect(talent1).approve(stakingV3.address, parseUnits("50"));

        await stakingV3.connect(talent1).stakeStable(talentToken1.address, parseUnits("25"));
        const stakeBefore = await stakingV3.stakes(talent1.address, talentToken1.address);
        const globalStakeBefore = await stakingV3.globalStakes(talent1.address);
        const virtualTALBalanceBefore = await virtualTAL.getBalance(talent1.address);

        await stakingV3.connect(talent1).stakeStable(talentToken1.address, parseUnits("25"));
        const stakeAfter = await stakingV3.stakes(talent1.address, talentToken1.address);
        const globalStakeAfter = await stakingV3.globalStakes(talent1.address);
        const virtualTALBalanceAfter = await virtualTAL.getBalance(talent1.address);

        expect(stakeBefore.talentAmount).to.eq(parseUnits("250"));
        expect(stakeAfter.talentAmount).to.eq(parseUnits("500"));
        expect(globalStakeBefore.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("25")));
        expect(globalStakeAfter.tokenAmount).to.be.closeTo(await stakingV3.convertUsdToToken(parseUnits("50")), margin);
        expect(globalStakeAfter.lastCheckpointAt).to.be.gt(globalStakeBefore.lastCheckpointAt);
        expect(globalStakeBefore.talentS).to.equal(0);
        expect(globalStakeAfter.talentS).to.be.gt(0);
        expect(virtualTALBalanceBefore).to.equal(0);
        expect(virtualTALBalanceAfter).to.be.gt(0);
      });

      it("talent staking twice in different talents also goes through a checkpoint", async () => {
        await stable.connect(talent1).approve(stakingV3.address, parseUnits("50"));

        await stakingV3.connect(talent1).stakeStable(talentToken1.address, parseUnits("20"));
        const globalStakeBefore = await stakingV3.globalStakes(talent1.address);
        const virtualTALBalanceBefore = await virtualTAL.getBalance(talent1.address);

        await stakingV3.connect(talent1).stakeStable(talentToken2.address, parseUnits("30"));
        const stake1 = await stakingV3.stakes(talent1.address, talentToken1.address);
        const stake2 = await stakingV3.stakes(talent1.address, talentToken2.address);
        const globalStakeAfter = await stakingV3.globalStakes(talent1.address);
        const globalStakeTalent2 = await stakingV3.globalStakes(talent2.address);
        const virtualTALBalanceAfter = await virtualTAL.getBalance(talent1.address);
        const virtualTALBalanceTalent2 = await virtualTAL.getBalance(talent2.address);

        expect(stake1.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("20")));
        expect(stake1.talentAmount).to.equal(await stakingV3.convertUsdToTalent(parseUnits("20")));
        expect(stake2.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("30")));
        expect(stake2.talentAmount).to.equal(await stakingV3.convertUsdToTalent(parseUnits("30")));
        expect(globalStakeBefore.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("20")));
        expect(globalStakeAfter.tokenAmount).to.equal(await stakingV3.convertUsdToToken(parseUnits("50")));
        expect(globalStakeAfter.lastCheckpointAt).to.be.gt(globalStakeBefore.lastCheckpointAt);
        expect(globalStakeBefore.talentS).to.equal(0);
        expect(globalStakeAfter.talentS).to.equal(0);
        expect(globalStakeTalent2.talentS).to.be.gt(0);
        expect(virtualTALBalanceBefore).to.equal(0);
        expect(virtualTALBalanceAfter).to.equal(0);
        expect(virtualTALBalanceTalent2).to.be.gt(0);
      });

      it("fails if stake exceeds mintingAvailability", async () => {
        await stable.connect(owner).approve(stakingV3.address, await stable.balanceOf(owner.address));

        const action = stakingV3
          .connect(owner)
          .stakeStable(talentToken1.address, await stable.balanceOf(owner.address));

        await expect(action).to.be.revertedWith("not enough minting availability");
      });
    });

    describe("swapStableForToken", () => {
      it("swaps existing stable coin for TAL", async () => {
        const stableAmount = parseUnits("25");
        const tokenAmount = await stakingV3.convertUsdToToken(stableAmount);
        const initialOwnerStableBalance = await stable.balanceOf(owner.address);
        const initialOwnerTalBalance = await tal.balanceOf(owner.address);

        await stable.connect(investor1).approve(stakingV3.address, stableAmount);
        await stakingV3.connect(investor1).stakeStable(talentToken1.address, stableAmount);

        await stakingV3.setToken(tal.address);
        await tal.connect(owner).approve(stakingV3.address, tokenAmount);

        const action = stakingV3.connect(owner).swapStableForToken(stableAmount);

        await expect(action).not.to.be.reverted;

        expect(await tal.balanceOf(stakingV3.address)).to.equal(tokenAmount);
        expect(await tal.balanceOf(owner.address)).to.equal(initialOwnerTalBalance.sub(tokenAmount));

        expect(await stable.balanceOf(stakingV3.address)).to.equal(0);
        expect(await stable.balanceOf(owner.address)).to.equal(initialOwnerStableBalance.add(stableAmount));
      });

      it("deducts totalStableStored", async () => {
        const stableAmount = parseUnits("25");
        const tokenAmount = await stakingV3.convertUsdToToken(stableAmount);

        await stable.connect(investor1).approve(stakingV3.address, stableAmount);
        await stakingV3.connect(investor1).stakeStable(talentToken1.address, stableAmount);
        await stakingV3.setToken(tal.address);

        await tal.connect(owner).approve(stakingV3.address, tokenAmount);

        expect(await stakingV3.totalStableStored()).to.equal(stableAmount);

        await stakingV3.connect(owner).swapStableForToken(parseUnits("15"));

        expect(await stakingV3.totalStableStored()).to.equal(parseUnits("10"));
      });

      it("does not allow non-admins", async () => {
        const action = stakingV3.connect(investor1).swapStableForToken(0);

        await expect(action).to.be.revertedWith(
          `AccessControl: account ${investor1.address.toLowerCase()} is missing role ${await stakingV3.DEFAULT_ADMIN_ROLE()}`
        );
      });

      it("does not accept withdrawing more stable coin than available", async () => {
        const stableAmount = parseUnits("25");
        const tokenAmount = await stakingV3.convertUsdToToken(stableAmount);

        await stable.connect(investor1).approve(stakingV3.address, stableAmount);
        await stakingV3.connect(investor1).stakeStable(talentToken1.address, stableAmount);

        await stakingV3.setToken(tal.address);

        await tal.connect(owner).approve(stakingV3.address, tokenAmount);

        const action = stakingV3.connect(owner).swapStableForToken(parseUnits("50"));

        await expect(action).to.be.revertedWith("not enough stable in contract");
      });
    });

    describe("claimRewardsToVirtualTAL", () => {
      it("emits a RewardWithdrawal event and updates the stake", async () => {
        const amount = parseUnits("50");
        await stable.connect(investor1).approve(stakingV3.address, amount);
        await stakingV3.connect(investor1).stakeStable(talentToken1.address, amount);

        ensureTimestamp(end);

        const tx = await stakingV3.connect(investor1).claimRewardsToVirtualTAL();

        const event = await findEvent(tx, "RewardWithdrawal");

        expect(event?.args?.owner).to.eq(investor1.address);
        expect(event?.args?.stakerReward).to.be.gt(0);
        expect(event?.args?.talentReward).to.equal(0);

        // updates stake amount
        const stake = await stakingV3.stakes(investor1.address, talentToken1.address);
        expect(stake.tokenAmount).to.eq(await stakingV3.convertUsdToToken(amount));

        // updates virtualTALBalance
        const virtualTALBalance = await virtualTAL.getBalance(investor1.address);
        expect(virtualTALBalance).to.equal(event?.args?.stakerReward);

        expect(await stakingV3.talentS()).to.be.gt(0);
      });
    });

    describe("withdrawRewards", () => {
      it("sends rewards to the owner", async () => {
        const amount = parseUnits("50");
        await enterPhaseTwo();
        await transferAndCall(tal, investor1, stakingV3.address, amount, talentToken1.address);

        ensureTimestamp(end);

        const balanceBefore = await tal.balanceOf(investor1.address);
        const tx = await stakingV3.connect(investor1).withdrawRewards();
        const balanceAfter = await tal.balanceOf(investor1.address);

        const event = await findEvent(tx, "RewardWithdrawal");

        expect(event?.args?.owner).to.eq(investor1.address);
        expect(event?.args?.stakerReward).to.be.gt(0);
        expect(event?.args?.talentReward).to.equal(0);

        // updates stake amount
        const stake = await stakingV3.stakes(investor1.address, talentToken1.address);
        expect(stake.tokenAmount).to.eq(amount);

        // updates owner's balance
        expect(balanceAfter).to.eq(balanceBefore.add(event?.args?.stakerReward));
      });
    });

    describe("withdrawTalentRewards", () => {
      it("allows talent to withdraw his redeemable share", async () => {
        const amount = parseUnits("50");
        await enterPhaseTwo();
        await transferAndCall(tal, investor1, stakingV3.address, amount, talentToken1.address);
        await stakingV3.connect(talent1).withdrawTalentRewards(talentToken1.address);
        const balanceBefore = await tal.balanceOf(talent1.address);
        expect(balanceBefore).to.equal(0);

        await transferAndCall(tal, investor1, stakingV3.address, amount, talentToken1.address);
        ensureTimestamp(end);

        await stakingV3.connect(talent1).withdrawTalentRewards(talentToken1.address);
        const balanceAfter = await tal.balanceOf(talent1.address);

        expect(balanceAfter).to.be.gt(0);
      });

      it("does not allows talent to withdraw another talent's redeemable share", async () => {
        await enterPhaseTwo();

        const action = stakingV3.connect(talent2).withdrawTalentRewards(talentToken1.address);

        await expect(action).to.be.revertedWith("only owner can withdraw shares");
      });
    });

    describe("withdrawTalentRewardsToVirtualTAL", () => {
      beforeEach(async () => {
        await stable.connect(talent1).approve(stakingV3.address, parseUnits("25"));
      });

      it("fails when talent tries to redeem other talent's rewards", async () => {
        const action = stakingV3.connect(talent2).withdrawTalentRewardsToVirtualTAL(talentToken1.address);

        await expect(action).to.be.revertedWith("only owner can withdraw shares");
      });

      it("allows talent to withdraw his redeemable share", async () => {
        await stable.connect(talent1).approve(stakingV3.address, parseUnits("50"));
        await stakingV3.connect(talent1).stakeStable(talentToken1.address, parseUnits("25"));
        await stakingV3.connect(talent1).withdrawTalentRewardsToVirtualTAL(talentToken1.address);
        const virtualTALBalanceBefore = await virtualTAL.getBalance(talent1.address);
        expect(virtualTALBalanceBefore).to.be.equal(0);

        await stakingV3.connect(talent1).stakeStable(talentToken1.address, parseUnits("25"));
        await stakingV3.connect(talent1).withdrawTalentRewardsToVirtualTAL(talentToken1.address);
        const virtualTALBalanceAfter = await virtualTAL.getBalance(talent1.address);

        expect(virtualTALBalanceAfter).to.be.gt(0);
      });
    });

    describe("stakingAvailability", () => {
      it("shows how much TAL can be staked in a token", async () => {
        await enterPhaseTwo();

        const amount = parseUnits("50");
        const amountBefore = await stakingV3.stakeAvailability(talentToken1.address);
        await transferAndCall(tal, investor1, stakingV3.address, amount, talentToken1.address);
        const amountAfter = await stakingV3.stakeAvailability(talentToken1.address);

        expect(amountAfter).to.equal(amountBefore.sub(amount));

        expect(amountAfter).to.eq(await stakingV3.convertTalentToToken(await talentToken1.mintingAvailability()));
      });

      it("corresponds to the talent token amount converted to TAL according to the rate", async () => {
        await enterPhaseTwo();

        const amount = parseUnits("50");

        const amountBefore = await stakingV3.stakeAvailability(talentToken1.address);
        expect(amountBefore).to.eq(await stakingV3.convertTalentToToken(await talentToken1.mintingAvailability()));

        await transferAndCall(tal, investor1, stakingV3.address, amount, talentToken1.address);

        const amountAfter = await stakingV3.stakeAvailability(talentToken1.address);
        expect(amountAfter).to.eq(await stakingV3.convertTalentToToken(await talentToken1.mintingAvailability()));
      });
    });

    describe("ERC1363Receiver", () => {
      describe("onTransferReceived", () => {
        describe("TAL stakes", () => {
          it("creates a stake", async () => {
            await stakingV3.setToken(tal.address);

            await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);

            const stake = await stakingV3.stakes(investor1.address, talentToken1.address);

            expect(stake.tokenAmount).to.equal(parseUnits("50"));
          });

          it("allows creating stakes in different talents", async () => {
            await stakingV3.setToken(tal.address);

            await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);
            await transferAndCall(tal, investor1, stakingV3.address, parseUnits("100"), talentToken2.address);

            const stake1 = await stakingV3.stakes(investor1.address, talentToken1.address);
            const stake2 = await stakingV3.stakes(investor1.address, talentToken2.address);
            const globalStake = await stakingV3.globalStakes(investor1.address);
            const virtualTALBalance = await virtualTAL.getBalance(talent1.address);

            expect(stake1.tokenAmount).to.equal(parseUnits("50"));
            expect(stake2.tokenAmount).to.equal(parseUnits("100"));
            expect(globalStake.tokenAmount).to.equal(parseUnits("150"));
          });

          it("emits the expected Stake event", async () => {
            await stakingV3.setToken(tal.address);

            const action = transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);

            await expect(action)
              .to.emit(stakingV3, "Stake")
              .withArgs(investor1.address, talentToken1.address, parseUnits("50"), false);
          });

          it("updates totalTokensStaked", async () => {
            await stakingV3.setToken(tal.address);

            await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);
            expect(await stakingV3.totalTokensStaked()).to.equal(parseUnits("50"));

            await transferAndCall(tal, investor1, stakingV3.address, parseUnits("100"), talentToken2.address);
            expect(await stakingV3.totalTokensStaked()).to.be.closeTo(parseUnits("150"), margin);
          });

          it("rejects TAL stakes while not yet", async () => {
            const action = transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);

            await expect(action).to.be.revertedWith("Unrecognized ERC1363 token received");
          });

          it("fails if stake exceeds mintingAvailability", async () => {
            await stakingV3.setToken(tal.address);

            const action = transferAndCall(
              tal,
              owner,
              stakingV3.address,
              await tal.balanceOf(owner.address),
              talentToken1.address
            );

            await expect(action).to.be.revertedWith("not enough minting availability");
          });

          it("accepts TAL stakes in the second phase", async () => {
            await stakingV3.setToken(tal.address);

            const investorTalBalanceBefore = await tal.balanceOf(investor1.address);
            const action = transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);

            await expect(action).not.to.be.reverted;

            // TAL is deducted
            expect(await tal.balanceOf(investor1.address)).to.eq(investorTalBalanceBefore.sub(parseUnits("50")));

            const talentBalance = await talentToken1.balanceOf(investor1.address);
            const expectedBalance = await stakingV3.convertTokenToTalent(parseUnits("50"));

            // // NAPS is credited
            expect(talentBalance).to.equal(expectedBalance);
            expect(talentBalance).not.to.equal(parseUnits("0"));
          });
        });

        describe("Talent Token refunds", () => {
          it("rejects tokens while TAL is not yet set", async () => {
            const action = transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);

            await expect(action).to.be.revertedWith("Unrecognized ERC1363 token received");
          });

          it("accepts Talent Tokens in the second phase, to refund a TAL investment", async () => {
            await enterPhaseTwo();

            // mint new NAPS
            await transferAndCall(tal, investor1, stakingV3.address, parseUnits("5"), talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const investorTalBalanceBefore = await tal.balanceOf(investor1.address);
            await transferAndCall(talentToken1, investor1, stakingV3.address, parseUnits("1"), null);

            // NAPS is burned
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("0"));

            // TAL is returned
            expect(await tal.balanceOf(investor1.address)).to.be.closeTo(
              investorTalBalanceBefore.add(parseUnits("5")),
              margin
            );
          });

          it("emits the expected Unstake event", async () => {
            await enterPhaseTwo();

            const amount = parseUnits("5");

            // mint new NAPS
            await transferAndCall(tal, investor1, stakingV3.address, amount, talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const action = transferAndCall(talentToken1, investor1, stakingV3.address, parseUnits("1"), null);

            await expect(action).to.emit(stakingV3, "Unstake");
          });

          it("deducts from totalTokensStaked", async () => {
            await enterPhaseTwo();

            // mint new NAPS
            await transferAndCall(tal, investor1, stakingV3.address, parseUnits("5"), talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const totalBefore = await stakingV3.totalTokensStaked();
            await transferAndCall(talentToken1, investor1, stakingV3.address, parseUnits("0.5"), null);
            const totalAfter = await stakingV3.totalTokensStaked();

            expect(totalAfter).to.be.closeTo(totalBefore.sub(parseUnits("2.5")), margin);
          });

          it("performs a checkpoint and keeps a stake with the remainder", async () => {
            await enterPhaseTwo();

            // mint new NAPS
            await transferAndCall(tal, investor1, stakingV3.address, parseUnits("10"), talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("2"));

            const investorTalBalanceBefore = await tal.balanceOf(investor1.address);
            await transferAndCall(talentToken1, investor1, stakingV3.address, parseUnits("1"), null);

            // proportional amount of TAL is returned
            expect(await tal.balanceOf(investor1.address)).to.be.closeTo(
              investorTalBalanceBefore.add(parseUnits("5")),
              margin
            );

            // remaining TAL is still staked
            const stakeAfter = await stakingV3.stakes(investor1.address, talentToken1.address);
            expect(stakeAfter.tokenAmount).to.be.closeTo(parseUnits("5"), margin);
          });
        });
      });
    });

    describe("stableCoinBalance", () => {
      it("returns the amount of stable coin held", async () => {
        await stable.connect(investor1).transfer(stakingV3.address, parseUnits("1"));
        await stable.connect(investor1).transfer(stakingV3.address, parseUnits("2.5"));

        expect(await stakingV3.stableCoinBalance()).to.equal(parseUnits("3.5"));
      });
    });

    describe("tokenBalance", () => {
      it("returns the amount of tokens held", async () => {
        await stakingV3.setToken(tal.address);

        await tal.connect(investor1).transfer(stakingV3.address, parseUnits("1"));
        await tal.connect(investor1).transfer(stakingV3.address, parseUnits("2.5"));

        expect(await stakingV3.tokenBalance()).to.equal(parseUnits("3.5"));
      });
    });

    describe("convertUsdToToken", () => {
      it("converts a USD value to TAL based on given rate", async () => {
        expect(await stakingV3.convertUsdToToken(parseUnits("1"))).to.equal(parseUnits("50"));
      });
    });

    describe("convertTokenToTalent", () => {
      it("converts a TAL value to a talent token based on a given rate", async () => {
        expect(await stakingV3.convertTokenToTalent(parseUnits("5"))).to.equal(parseUnits("1"));
      });
    });

    describe("convertTalentToToken", () => {
      it("converts a Talent token value to TAL based on a given rate", async () => {
        expect(await stakingV3.convertTalentToToken(parseUnits("1"))).to.equal(parseUnits("5"));
      });
    });

    describe("convertUsdToTalent", () => {
      it("converts a USD value to a talent token based on both given rates", async () => {
        expect(await stakingV3.convertUsdToTalent(parseUnits("2"))).to.equal(parseUnits("20"));
      });
    });

    describe("activeStakes", () => {
      it("increments with a stable coin stake", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("25"));
        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));

        expect(await stakingV3.activeStakes()).to.equal(1);

        await stable.connect(investor2).approve(stakingV3.address, parseUnits("25"));
        await stakingV3.connect(investor2).stakeStable(talentToken1.address, parseUnits("25"));

        expect(await stakingV3.activeStakes()).to.equal(2);
      });

      it("increments with a TAL stake", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);
        expect(await stakingV3.activeStakes()).to.equal(1);
        await transferAndCall(tal, investor2, stakingV3.address, parseUnits("50"), talentToken2.address);
        expect(await stakingV3.activeStakes()).to.equal(2);
      });

      it("does not count duplicates if same stake is reinforced", async () => {
        await stakingV3.setToken(tal.address);

        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);
        expect(await stakingV3.activeStakes()).to.equal(1);
        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);
        expect(await stakingV3.activeStakes()).to.equal(1);
      });

      it("counts twice duplicates if same investor stakes in two talents", async () => {
        await stakingV3.setToken(tal.address);

        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);
        expect(await stakingV3.activeStakes()).to.equal(1);
        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken2.address);
        expect(await stakingV3.activeStakes()).to.equal(2);
      });

      it("decrements if a full refund is requested", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("5"), talentToken1.address);
        expect(await stakingV3.activeStakes()).to.equal(1);
        await transferAndCall(talentToken1, investor1, stakingV3.address, parseUnits("1"), null);
        expect(await stakingV3.activeStakes()).to.equal(0);
      });

      it("decrements if two full refunds are requested", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("5"), talentToken1.address);
        expect(await stakingV3.activeStakes()).to.equal(1);
        await transferAndCall(talentToken1, investor1, stakingV3.address, parseUnits("1"), null);
        expect(await stakingV3.activeStakes()).to.equal(0);

        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("5"), talentToken1.address);
        expect(await stakingV3.activeStakes()).to.equal(1);
        await transferAndCall(talentToken1, investor1, stakingV3.address, parseUnits("1"), null);
        expect(await stakingV3.activeStakes()).to.equal(0);
      });

      it("does not decrement if a partial refund is requested", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("5"), talentToken1.address);

        expect(await stakingV3.activeStakes()).to.equal(1);
        await transferAndCall(talentToken1, investor1, stakingV3.address, parseUnits("0.5"), null);
        expect(await stakingV3.activeStakes()).to.equal(1);

        // refundind the remaining 50% decrements
        const balance = await talentToken1.balanceOf(investor1.address);

        await transferAndCall(talentToken1, investor1, stakingV3.address, balance, null);
        expect(await stakingV3.activeStakes()).to.equal(0);
      });
    });

    describe("disable", () => {
      it("disables staking", async () => {
        await stakingV3.disable();

        expect(await stakingV3.disabled());
      });

      it("is only callable by an admin", async () => {
        const action = stakingV3.connect(investor1).disable();

        expect(action).to.be.reverted;
      });

      it("prevents further stakes", async () => {
        await enterPhaseTwo();
        await stakingV3.disable();

        const action = transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);

        await expect(action).to.be.revertedWith("staking has been disabled");
      });

      it("allows withdraws from existing stakes", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);

        const action = transferAndCall(talentToken1, investor1, stakingV3.address, parseUnits("0.5"), null);

        expect(action).not.to.be.reverted;
      });
    });

    describe("adminWithdraw", () => {
      it("withdraws all remaining rewards", async () => {
        await enterPhaseTwo();
        await stakingV3.disable();

        const rewards = await stakingV3.rewardsLeft();

        const balanceBefore = await tal.balanceOf(owner.address);
        await stakingV3.adminWithdraw();
        const balanceAfter = await tal.balanceOf(owner.address);

        expect(rewards).to.be.gt(0);
        expect(balanceAfter).to.equal(balanceBefore.add(rewards));
        expect(await tal.balanceOf(stakingV3.address)).to.equal(0);
        expect(await stakingV3.rewardsLeft()).to.equal(0);
      });

      it("is only callable by an admin", async () => {
        const action = stakingV3.connect(investor1).adminWithdraw();

        expect(action).to.be.reverted;
      });

      it("is not callable if there's nothing to withdraw", async () => {
        await enterPhaseTwo();
        await stakingV3.disable();
        await stakingV3.adminWithdraw();

        const action = stakingV3.adminWithdraw();

        await expect(action).to.be.revertedWith("nothing left to withdraw");
      });

      it("is not callable if there is an active stake", async () => {
        await enterPhaseTwo();
        await transferAndCall(tal, investor1, stakingV3.address, parseUnits("50"), talentToken1.address);
        await stakingV3.disable();

        const action = stakingV3.adminWithdraw();

        await expect(action).to.be.revertedWith(
          "there are still active stakes"
        );
      });
    });

    describe("setTokenPrice", () => {
      it("is callable by an admin", async () => {
        const action = await stakingV3.connect(owner).setTokenPrice(parseUnits("1"));

        expect(await stakingV3.tokenPrice()).to.eq(parseUnits("1"));
      });

      it("is not callable by a random user", async () => {
        const action = stakingV3.connect(investor1).setTokenPrice(parseUnits("1"));

        await expect(action).to.be.revertedWith(
          `AccessControl: account ${investor1.address.toLowerCase()} is missing role ${await stakingV3.DEFAULT_ADMIN_ROLE()}`
        );
      });

      it("changes the token price", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("1"));

        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));
        expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("10"));

        await stakingV3.connect(owner).setTokenPrice(parseUnits("0.2"));

        await stable.connect(investor2).approve(stakingV3.address, parseUnits("1"));

        await stakingV3.connect(investor2).stakeStable(talentToken1.address, parseUnits("1"));
        expect(await talentToken1.balanceOf(investor2.address)).to.equal(parseUnits("1"));
      });
    });

    describe("version", () => {
      it("returns 2", async () => {
        expect(await stakingV3.version()).to.eq(3);
      });
    });

    describe("createStakeWithVirtualTAL", () => {
      it("create stake and burns virtual TAL", async () => {
        await virtualTAL.adminMint(investor1.address, parseUnits("100"));
        const action = await stakingV3
          .connect(investor1)
          .createStakeWithVirtualTAL(talentToken1.address, parseUnits("100"));

        // mints talent tokens
        const talentBalance = await talentToken1.balanceOf(investor1.address);
        const expectedBalance = await stakingV3.convertTokenToTalent(parseUnits("100"));

        expect(talentBalance).to.equal(expectedBalance);
        expect(talentBalance).not.to.equal(parseUnits("0"));

        //  burns virtual TAL
        const virtualTALBalance = await virtualTAL.getBalance(investor1.address);
        expect(virtualTALBalance).to.equal(parseUnits("0"));

        await expect(action).to.emit(stakingV3, "Stake");
      });

      it("fails when the investor does not own enough Virtual TAL", async () => {
        await virtualTAL.adminMint(investor1.address, parseUnits("100"));
        const action = stakingV3.connect(investor1).createStakeWithVirtualTAL(talentToken1.address, parseUnits("1000"));

        await expect(action).to.be.revertedWith("not enough TAL");
      });

      it("updates the investor global variables", async () => {
        await virtualTAL.adminMint(investor1.address, parseUnits("100"));
        await stakingV3.connect(investor1).createStakeWithVirtualTAL(talentToken1.address, parseUnits("100"));

        const investorGlobalStake = await stakingV3.globalStakes(investor1.address);
        expect(investorGlobalStake.tokenAmount).to.eq(parseUnits("100"));
      });
    });

    describe("sellTalentTokenForVirtualTAL", () => {
      it("partially sells talent tokens and mints virtual TAL", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("1"));
        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));

        const action = await stakingV3
          .connect(investor1)
          .sellTalentTokenForVirtualTAL(talentToken1.address, parseUnits("2"));

        // burns talent tokens
        const talentBalance = await talentToken1.balanceOf(investor1.address);
        // 10 - 2 = 8 + margin to account for rewards
        expect(talentBalance).to.be.closeTo(parseUnits("8"), margin);

        // mints virtual TAL
        const virtualTALBalance = await virtualTAL.getBalance(investor1.address);
        const expectedBalance = await stakingV3.convertTalentToToken(parseUnits("2"));

        expect(virtualTALBalance).to.be.closeTo(expectedBalance, margin);

        await expect(action).to.emit(stakingV3, "Unstake");
      });

      it("sells all talent tokens and mints virtual TAL", async () => {
        await stable.connect(investor1).approve(stakingV3.address, parseUnits("1"));
        await stakingV3.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));

        const action = await stakingV3
          .connect(investor1)
          .sellTalentTokenForVirtualTAL(talentToken1.address, parseUnits("10"));

        // burns talent tokens
        const talentBalance = await talentToken1.balanceOf(investor1.address);
        // 10 - 10 = exactly 0
        expect(talentBalance).to.equal(parseUnits("0"));

        // mints virtual TAL
        const virtualTALBalance = await virtualTAL.getBalance(investor1.address);
        const expectedBalance = await stakingV3.convertTalentToToken(parseUnits("10"));

        expect(virtualTALBalance).to.be.closeTo(expectedBalance, margin);

        await expect(action).to.emit(stakingV3, "Unstake");
      });
    });
  });
});
