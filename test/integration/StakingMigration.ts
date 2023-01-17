import chai from "chai";
import { ethers, network, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type {
  TalentProtocol,
  USDTMock,
  TalentFactory,
  Staking,
  TalentToken,
  TalentFactoryV2,
  StakingMigration,
  TalentFactoryV2__factory,
  RewardCalculator,
} from "../../typechain-types";

import { TalentTokenV2__factory, UpgradeableBeacon__factory } from "../../typechain-types";
import TalentTokenV2Artifact from "../../artifacts/contracts/test/TalentTokenV2.sol/TalentTokenV2.json";

import { Artifacts } from "../shared";
import { deployTalentToken, ensureTimestamp, findEvent } from "../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("StakingMigration", () => {
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let talent3: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;
  let investor3: SignerWithAddress;

  let tal: TalentProtocol;
  let stable: USDTMock;
  let talentToken1: TalentToken;
  let talentToken2: TalentToken;
  let talentToken3: TalentToken;
  let factory: TalentFactory;
  let staking: Staking;

  let start = dayjs().add(1, "day").unix();
  let end = dayjs.unix(start).add(100, "days").unix();

  const rewards = parseUnits("100");
  const margin = parseUnits("0.001") as unknown as number;

  // deploy setup
  beforeEach(async () => {
    const lastBlock = await ethers.provider.getBlockNumber();
    const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;

    start = dayjs.unix(timestamp).add(1, "day").unix(); // one minute later
    end = dayjs.unix(timestamp).add(100, "days").unix();

    [owner, minter, talent1, talent2, talent3, investor1, investor2, investor3] = await ethers.getSigners();

    stable = (await deployContract(owner, Artifacts.USDTMock, [])) as USDTMock;

    const TalentProtocolFactory = await ethers.getContractFactory("TalentProtocol");
    tal = (await upgrades.deployProxy(TalentProtocolFactory, [parseUnits("100000000")])) as TalentProtocol;

    // factory = (await deployContract(owner, Artifacts.TalentFactory, [])) as TalentFactory;
    // factory is deployed as a proxy already, to ensure `initialize` is called
    const FactoryFactory = await ethers.getContractFactory("TalentFactory");
    factory = (await upgrades.deployProxy(FactoryFactory, [])) as TalentFactory;

    const RewardCalculator = await ethers.getContractFactory("RewardCalculator");
    const rewardCalculator = (await upgrades.deployProxy(RewardCalculator, [])) as RewardCalculator;

    const StakingContract = await ethers.getContractFactory("Staking");
    staking = (await upgrades.deployProxy(StakingContract, [
      start,
      end,
      rewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("5"),
      rewardCalculator.address,
    ])) as Staking;
    await staking.deployed();

    await factory.setMinter(staking.address);

    // deploy talent tokens
    talentToken1 = await deployTalentToken(factory, minter, talent1, "Miguel Palhas", "NAPS");
    talentToken2 = await deployTalentToken(factory, minter, talent2, "Francisco Leal", "LEAL");
    talentToken3 = await deployTalentToken(factory, minter, talent2, "Andreas Vilela", "AVIL");

    // fund investors
    await stable.connect(owner).transfer(investor1.address, parseUnits("100000"));
    await stable.connect(owner).transfer(investor2.address, parseUnits("100000"));
    await stable.connect(owner).transfer(investor3.address, parseUnits("100000"));
    await tal.connect(owner).transfer(investor1.address, parseUnits("100000"));
    await tal.connect(owner).transfer(investor2.address, parseUnits("100000"));
    await tal.connect(owner).transfer(investor3.address, parseUnits("100000"));
  });

  async function enterPhaseTwo() {
    await staking.connect(owner).setToken(tal.address);
    await tal.connect(owner).transfer(staking.address, rewards);
  }

  it("allows the new contract to be migrated", async () => {
    ensureTimestamp(start);
    const amount = parseUnits("25");
    // criar stakes
    await stable.connect(investor1).approve(staking.address, amount);
    await staking.connect(investor1).stakeStable(talentToken1.address, amount);

    // andar no tempo para a frente
    ensureTimestamp((start + end) / 2);
    const tx = await staking.connect(investor1).claimRewards(talentToken1.address);
    const event = await findEvent(tx, "RewardClaim");

    expect(event?.args?.owner).to.eq(investor1.address);
    expect(event?.args?.talentToken).to.eq(talentToken1.address);
    expect(event?.args?.stakerReward).to.be.gt(0);
    expect(event?.args?.talentReward).to.be.gt(0);

    // updates stake amount
    const stake = await staking.stakes(investor1.address, talentToken1.address);
    const amountInTal = amount.mul(50);
    expect(stake.tokenAmount).to.eq(amountInTal.add(event?.args?.stakerReward));

    // deploy of a new smart contract (V2)

    const RewardCalculator = await ethers.getContractFactory("RewardCalculator");
    const rewardCalculator = (await upgrades.deployProxy(RewardCalculator, [])) as RewardCalculator;

    const StakingMigrationContract = await ethers.getContractFactory("StakingMigration");
    const stakingv2 = (await upgrades.deployProxy(StakingMigrationContract, [
      start,
      end,
      rewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("5"),
      rewardCalculator.address,
    ])) as StakingMigration;
    await stakingv2.deployed();

    // upgrade the factory
    const TalentFactoryV2Factory = (await ethers.getContractFactory("TalentFactoryV2")) as TalentFactoryV2__factory;
    const factoryv2 = (await upgrades.upgradeProxy(factory, TalentFactoryV2Factory)) as TalentFactoryV2;

    await factoryv2.connect(owner).transferMinter(stakingv2.address);

    expect(await factory.minter()).to.eq(stakingv2.address);

    // upgrade do talent token + migrar o minter do talent token
    const talentTokenV2 = await deployContract(owner, TalentTokenV2Artifact, []);
    const beaconAddr = await factory.implementationBeacon();
    const beacon = UpgradeableBeacon__factory.connect(beaconAddr, owner);

    await beacon.upgradeTo(talentTokenV2.address);
    const talentTokenv2 = TalentTokenV2__factory.connect(talentToken1.address, owner);

    expect(await talentTokenv2.hasRole(await talentToken1.ROLE_MINTER(), staking.address)).to.eq(true);

    await talentTokenv2.connect(owner).removeMinter(staking.address);
    await talentTokenv2.connect(owner).addNewMinter(stakingv2.address);

    expect(await talentTokenv2.hasRole(await talentToken1.ROLE_MINTER(), staking.address)).to.eq(false);
    expect(await talentTokenv2.hasRole(await talentToken1.ROLE_MINTER(), stakingv2.address)).to.eq(true);
    // migrar o estado do v1 para o v2

    const stakev1 = await staking.stakes(investor1.address, talentToken1.address);

    await stakingv2.transferStake(investor1.address, talentToken1.address, stakev1);

    const stakev2 = await stakingv2.stakes(investor1.address, talentToken1.address);

    expect(stakev1.S).to.eq(stakev2.S);
    expect(stakev1.tokenAmount).to.eq(stakev2.tokenAmount);
    expect(stakev1.talentAmount).to.eq(stakev2.talentAmount);
    expect(stakev1.lastCheckpointAt).to.eq(stakev2.lastCheckpointAt);
    expect(stakev1.finishedAccumulating).to.eq(stakev2.finishedAccumulating);

    const talentRewards = await staking.talentRedeemableRewards(talentToken1.address);
    const maxTalentS = await staking.maxSForTalent(talentToken1.address);

    await stakingv2.setTalentState(talentToken1.address, talentRewards, maxTalentS);

    await stakingv2.setAccumulatedState(
      await staking.activeStakes(),
      await staking.totalStableStored(),
      await staking.totalTokensStaked(),
      await staking.rewardsGiven()
    );

    await stakingv2.setRealtimeState(await staking.S(), await staking.SAt(), await staking.totalAdjustedShares());

    expect(await stakingv2.activeStakes()).to.eq(await staking.activeStakes());
    expect(await stakingv2.totalStableStored()).to.eq(await staking.totalStableStored());
    expect(await stakingv2.totalStableStored()).to.eq(await staking.totalStableStored());
    expect(await stakingv2.totalTokensStaked()).to.eq(await staking.totalTokensStaked());
    expect(await stakingv2.S()).to.eq(await staking.S());
    expect(await stakingv2.SAt()).to.eq(await staking.SAt());
    expect(await stakingv2.totalAdjustedShares()).to.eq(await staking.totalAdjustedShares());
  });

  it("claiming rewards before the migration and after the migration give similar results", async () => {
    ensureTimestamp(start);
    const amount = parseUnits("25");
    // criar stakes
    await stable.connect(investor1).approve(staking.address, amount);
    await staking.connect(investor1).stakeStable(talentToken1.address, amount);
    await stable.connect(investor2).approve(staking.address, amount);
    await staking.connect(investor2).stakeStable(talentToken1.address, amount);

    // andar no tempo para a frente
    ensureTimestamp((start + end) / 2);
    const tx = await staking.connect(investor1).claimRewards(talentToken1.address);
    const event = await findEvent(tx, "RewardClaim");

    // updates stake amount
    const stake = await staking.stakes(investor1.address, talentToken1.address);
    const amountInTal = amount.mul(50);
    expect(stake.tokenAmount).to.eq(amountInTal.add(event?.args?.stakerReward));

    // deploy of a new smart contract (V2)
    const RewardCalculator = await ethers.getContractFactory("RewardCalculator");
    const rewardCalculator = (await upgrades.deployProxy(RewardCalculator, [])) as RewardCalculator;

    const StakingMigrationContract = await ethers.getContractFactory("StakingMigration");
    const stakingv2 = (await upgrades.deployProxy(StakingMigrationContract, [
      start,
      end,
      rewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("5"),
      rewardCalculator.address,
    ])) as StakingMigration;
    await stakingv2.deployed();

    // upgrade the factory
    const TalentFactoryV2Factory = (await ethers.getContractFactory("TalentFactoryV2")) as TalentFactoryV2__factory;
    const factoryv2 = (await upgrades.upgradeProxy(factory, TalentFactoryV2Factory)) as TalentFactoryV2;

    await factoryv2.connect(owner).transferMinter(stakingv2.address);

    // upgrade do talent token + migrar o minter do talent token
    const talentTokenV2 = await deployContract(owner, TalentTokenV2Artifact, []);
    const beaconAddr = await factory.implementationBeacon();
    const beacon = UpgradeableBeacon__factory.connect(beaconAddr, owner);

    await beacon.upgradeTo(talentTokenV2.address);
    const talentTokenv2 = TalentTokenV2__factory.connect(talentToken1.address, owner);

    expect(await talentTokenv2.hasRole(await talentToken1.ROLE_MINTER(), staking.address)).to.eq(true);

    await talentTokenv2.connect(owner).removeMinter(staking.address);
    await talentTokenv2.connect(owner).addNewMinter(stakingv2.address);

    const stake1 = await staking.stakes(investor1.address, talentToken1.address);
    await stakingv2.transferStake(investor1.address, talentToken1.address, stake1);

    const stake2 = await staking.stakes(investor2.address, talentToken1.address);
    await stakingv2.transferStake(investor2.address, talentToken1.address, stake2);

    const talentRewards = await staking.talentRedeemableRewards(talentToken1.address);
    const maxTalentS = await staking.maxSForTalent(talentToken1.address);

    await stakingv2.setTalentState(talentToken1.address, talentRewards, maxTalentS);

    await stakingv2.setAccumulatedState(
      await staking.activeStakes(),
      await staking.totalStableStored(),
      await staking.totalTokensStaked(),
      await staking.rewardsGiven()
    );

    await stakingv2.setRealtimeState(await staking.S(), await staking.SAt(), await staking.totalAdjustedShares());

    const tx2 = await stakingv2.connect(investor2).claimRewards(talentToken1.address);
    const event2 = await findEvent(tx2, "RewardClaim");
    expect(event?.args?.stakerReward).to.be.closeTo(event2?.args?.stakerReward, margin);
    expect(event?.args?.talentReward).to.be.closeTo(event2?.args?.talentReward, margin);
  });

  it("emits events on demand", async () => {
    ensureTimestamp(start);
    const amount = parseUnits("25");

    const RewardCalculator = await ethers.getContractFactory("RewardCalculator");
    const rewardCalculator = (await upgrades.deployProxy(RewardCalculator, [])) as RewardCalculator;

    const StakingMigrationContract = await ethers.getContractFactory("StakingMigration");
    const stakingv2 = (await upgrades.deployProxy(StakingMigrationContract, [
      start,
      end,
      rewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("5"),
      rewardCalculator.address,
    ])) as StakingMigration;
    await stakingv2.deployed();

    let action = stakingv2.connect(owner).emitStakeEvent(investor1.address, talentToken1.address, amount, true);

    await expect(action)
      .to.emit(stakingv2, "Stake")
      .withArgs(investor1.address, talentToken1.address, parseUnits("25"), true);

    action = stakingv2.connect(owner).emitRewardsClaimEvent(investor1.address, talentToken1.address, amount, amount);

    await expect(action)
      .to.emit(stakingv2, "RewardClaim")
      .withArgs(investor1.address, talentToken1.address, parseUnits("25"), parseUnits("25"));
  });
});
