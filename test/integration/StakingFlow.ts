import chai from "chai";
import { ethers, network, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TalentProtocol, USDTMock, TalentFactory, Staking, TalentToken } from "../../typechain";

import { ERC165, Artifacts } from "../shared";
import { deployTalentToken, transferAndCall, ensureTimestamp } from "../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("Staking", () => {
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

  // deploy setup
  beforeEach(async () => {
    const lastBlock = await ethers.provider.getBlockNumber();
    const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;

    start = dayjs.unix(timestamp).add(1, "day").unix(); // one minute later
    end = dayjs.unix(timestamp).add(100, "days").unix();

    [owner, minter, talent1, talent2, talent3, investor1, investor2, investor3] = await ethers.getSigners();

    stable = (await deployContract(owner, Artifacts.USDTMock, [])) as USDTMock;

    tal = (await deployContract(owner, Artifacts.TalentProtocol, [])) as TalentProtocol;

    factory = (await deployContract(owner, Artifacts.TalentFactory, [])) as TalentFactory;

    staking = (await deployContract(owner, Artifacts.Staking, [
      start,
      end,
      rewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("50"),
    ])) as Staking;

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
    await staking.setToken(tal.address);
    await tal.connect(owner).transfer(staking.address, rewards);
  }

  it("single staker, full period, same weight as talent", async () => {
    const amount = await staking.convertTalentToToken(parseUnits("1000"));
    await enterPhaseTwo();

    await ensureTimestamp(start);

    const stakerRewards = rewards.div(2);
    const talentRewards = rewards.div(2);

    await transferAndCall(tal, investor1, staking.address, amount, talentToken1.address);

    // travel to end of staking
    ensureTimestamp(end);

    const action = staking.connect(investor1).claimRewards(talentToken1.address);

    // check for event
    await expect(action)
      .to.emit(staking, "RewardClaim")
      .withArgs(investor1.address, talentToken1.address, stakerRewards, talentRewards);

    // check staker Rewards
    // margin of error is due to timestamps. stake doesn't actually get 100% of the timeframe
    const stake = await staking.stakes(investor1.address, talentToken1.address);
    expect(stake.tokenAmount).to.eq(amount.add(stakerRewards));

    // talent can now get his share
    await staking.connect(talent1).withdrawTalentRewards(talentToken1.address);

    expect(await tal.balanceOf(talent1.address)).to.eq(talentRewards);
  });

  it("single staker, in stable coin, can later get TAL back", async () => {
    const amount = parseUnits("100");

    await ensureTimestamp(start);

    // mint NAPS
    await stable.connect(investor1).approve(staking.address, amount);
    await staking.connect(investor1).stakeStable(talentToken1.address, amount);

    // meanwhile, admin enables TAL, swaps cUSD for TAL
    enterPhaseTwo();
    const talAmount = await staking.convertUsdToToken(amount);
    await tal.connect(owner).approve(staking.address, talAmount);
    await staking.connect(owner).swapStableForToken(amount);

    // NAPS can now be refunded for the same TAL amount
    const action = transferAndCall(talentToken1, investor1, staking.address, amount, null);

    // // investor's balance should increase by `amount`, and Unstake event emited
    const balanceBefore = await tal.balanceOf(investor1.address);
    await expect(action).to.emit(staking, "Unstake");
    const balanceAfter = await tal.balanceOf(investor1.address);

    expect(balanceAfter).to.be.closeTo(balanceBefore.add(talAmount), parseUnits("0.01") as unknown as number);
  });

  it.only("three stakers, one longer than the others", async () => {
    // we stake the same amount as each talent himself owns, to keep the split 50-50
    const amount = await staking.convertTalentToToken(parseUnits("1000"));
    await enterPhaseTwo();

    await ensureTimestamp(start);

    await transferAndCall(tal, investor1, staking.address, amount, talentToken1.address);

    // travel to the middle of staking
    // ensureTimestamp((start + end) / 2);

    await transferAndCall(tal, investor2, staking.address, amount, talentToken2.address);
    await transferAndCall(tal, investor3, staking.address, amount, talentToken3.address);

    // travel to end of staking
    ensureTimestamp(end);

    // everyone withdraws, from first to last
    await staking.connect(investor1).withdrawRewards(talentToken1.address);
    await staking.connect(investor2).withdrawRewards(talentToken2.address);
    await staking.connect(investor3).withdrawRewards(talentToken3.address);

    // check staker Rewards
    // margin of error is due to timestamps. stake doesn't actually get 100% of the timeframe
    const stake1 = await staking.stakes(investor1.address, talentToken1.address);
    const stake2 = await staking.stakes(investor2.address, talentToken2.address);
    const stake3 = await staking.stakes(investor3.address, talentToken3.address);

    // calculate how much each one got as reward
    const reward1 = stake1.tokenAmount.sub(amount);
    const reward2 = stake2.tokenAmount.sub(amount);
    const reward3 = stake3.tokenAmount.sub(amount);

    // console.log(ethers.utils.formatEther(reward1));
    // console.log(ethers.utils.formatEther(reward2));
    // console.log(ethers.utils.formatEther(reward3));

    const talentReward1 = await staking.talentRedeemableRewards(talentToken1.address);
    const talentReward2 = await staking.talentRedeemableRewards(talentToken2.address);
    const talentReward3 = await staking.talentRedeemableRewards(talentToken3.address);

    // console.log(ethers.utils.formatEther(talentReward1));
    // console.log(ethers.utils.formatEther(talentReward2));
    // console.log(ethers.utils.formatEther(talentReward3));

    // first staker gets around 70% of the total reward
    expect(reward1).to.be.closeTo(parseUnits("16"), parseUnits("0.001") as unknown as number);
    expect(stake1.tokenAmount).to.eq(amount.add(parseUnits("0")));
  });
});
