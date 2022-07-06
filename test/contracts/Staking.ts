import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TalentProtocol, USDTMock, TalentFactory, TalentFactoryV2, StakingV2, Staking, TalentToken } from "../../typechain";

import { ERC165, Artifacts } from "../shared";
import { deployTalentToken, transferAndCall, ensureTimestamp, findEvent } from "../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("Staking", () => {
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
  let factory: TalentFactory;
  let staking: Staking;

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

    const TalentProtocolFactory = await ethers.getContractFactory("TalentProtocol");
    tal = (await upgrades.deployProxy(TalentProtocolFactory, [parseUnits("1000000000")], {unsafeAllow: ['delegatecall']})) as TalentProtocol;

    await tal.connect(owner).transfer(investor1.address, parseUnits("1000"));
    await tal.connect(owner).transfer(investor2.address, parseUnits("1000"));

    // factory is deployed as a proxy already, to ensure `initialize` is called
    const FactoryFactory = await ethers.getContractFactory("TalentFactory");
    factory = (await upgrades.deployProxy(FactoryFactory, [])) as TalentFactory;
    upgrades.silenceWarnings()
  });

  describe("constructor", () => {
    it("works with valid arguments", async () => {
      const StakingContract = await ethers.getContractFactory("Staking");
      const action = upgrades.deployProxy(StakingContract, [
        start,
        end,
        rewards,
        stable.address,
        factory.address,
        parseUnits("0.02"),
        parseUnits("5"),
      ]);

      await expect(action).not.to.be.reverted;
    });

    it("fails if tokenPrice is 0", async () => {
      const StakingContract = await ethers.getContractFactory("Staking");
      const action = upgrades.deployProxy(StakingContract, [
        start,
        end,
        rewards,
        stable.address,
        factory.address,
        parseUnits("0"),
        parseUnits("50"),
      ]);

      await expect(action).to.be.revertedWith("_tokenPrice cannot be 0");
    });

    it("fails if talentPrice is 0", async () => {
      const StakingContract = await ethers.getContractFactory("Staking");
      const action = upgrades.deployProxy(StakingContract, [
        start,
        end,
        rewards,
        stable.address,
        factory.address,
        parseUnits("0.5"),
        parseUnits("0"),
      ]);

      await expect(action).to.be.revertedWith("_talentPrice cannot be 0");
    });
  });

  const builder = async (): Promise<Staking> => {
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

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IAccessControl"]);
  });

  describe("upgradabled", ()=> {
    beforeEach(async () => {
      const StakingContract = await ethers.getContractFactory("Staking");
      staking = (await upgrades.deployProxy(StakingContract, [
        start,
        end,
        rewards,
        stable.address,
        factory.address,
        parseUnits("0.02"),
        parseUnits("5"),
      ])) as Staking;

      await staking.deployed();
    });

    it("allows upgrading the factory itself", async () => {
      const TalentFactoryV2Factory = await ethers.getContractFactory("TalentFactoryV2");
      const factory2 = (await upgrades.upgradeProxy(factory, TalentFactoryV2Factory)) as TalentFactoryV2;

      expect(await factory2.isV2()).to.eq(true);
    });

    it("allows upgrading the staking contract", async () => {
      const StakingV2Factory = await ethers.getContractFactory("StakingV2");
      const staking2 = (await upgrades.upgradeProxy(staking, StakingV2Factory)) as StakingV2;

      expect(await staking2.isV2()).to.eq(true);
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      const lastBlock = await ethers.provider.getBlockNumber();
      const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;
      start = dayjs.unix(timestamp).add(1, "day").unix(); // one minute later

      staking = await builder();

      await factory.setMinter(staking.address);

      talentToken1 = await deployTalentToken(factory, minter, talent1, "Miguel Palhas", "NAPS");
      talentToken2 = await deployTalentToken(factory, minter, talent2, "Francisco Leal", "LEAL");

      await ensureTimestamp(start);
    });

    async function enterPhaseTwo() {
      await staking.setToken(tal.address);
      await tal.connect(owner).transfer(staking.address, rewards);
    }

    describe("stakeStable", () => {
      it("accepts stable coin stakes", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("25"));

        const investorStableBalanceBefore = await stable.balanceOf(investor1.address);
        const action = staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));

        await expect(action).not.to.be.reverted;

        // USDT is deducted
        expect(await stable.balanceOf(investor1.address)).to.eq(investorStableBalanceBefore.sub(parseUnits("25")));

        const talentBalance = await talentToken1.balanceOf(investor1.address);
        const expectedBalance = await staking.convertUsdToTalent(parseUnits("25"));

        // NAPS is credited
        expect(talentBalance).to.equal(expectedBalance);
        expect(talentBalance).not.to.equal(parseUnits("0"));
      });

      it("accepts stable coin stakes with decimals", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("0.0099"));

        const investorStableBalanceBefore = await stable.balanceOf(investor1.address);
        const action = staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("0.0099"));

        await expect(action).not.to.be.reverted;

        // USDT is deducted
        expect(await stable.balanceOf(investor1.address)).to.eq(investorStableBalanceBefore.sub(parseUnits("0.0099")));

        const talentBalance = await talentToken1.balanceOf(investor1.address);
        const expectedBalance = await staking.convertUsdToTalent(parseUnits("0.0099"));

        // NAPS is credited
        expect(talentBalance).to.equal(expectedBalance);
        expect(talentBalance).not.to.equal(parseUnits("0"));
      });

      it("creates a stake", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("25"));

        await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));

        const stake = await staking.stakes(investor1.address, talentToken1.address);

        expect(stake.tokenAmount).to.equal(await staking.convertUsdToToken(parseUnits("25")));
      });

      it("emits the expected Stake event", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("1"));

        const action = staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));

        await expect(action)
          .to.emit(staking, "Stake")
          .withArgs(investor1.address, talentToken1.address, parseUnits("50"), true);
      });

      it("updates totalTokensStaked", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("1"));
        await stable.connect(investor2).approve(staking.address, parseUnits("1"));

        await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));
        expect(await staking.totalTokensStaked()).to.equal(parseUnits("50"));

        await staking.connect(investor2).stakeStable(talentToken2.address, parseUnits("1"));
        expect(await staking.totalTokensStaked()).to.equal(parseUnits("100"));
      });

      it("does not allow other accounts to set the token", async () => {
        const action = staking.connect(investor1).setToken(tal.address);

        await expect(action).to.be.revertedWith(
          `AccessControl: account ${investor1.address.toLowerCase()} is missing role ${await staking.DEFAULT_ADMIN_ROLE()}`
        );
      });

      it("does not accept stable coin stakes while in phase2", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("1"));
        await staking.setToken(tal.address);

        const action = staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));

        await expect(action).to.be.revertedWith("Stable coin disabled");
      });

      it("updates totalStableStored", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("25"));
        await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));

        expect(await staking.totalStableStored()).to.eq(parseUnits("25"));
      });

      it("staking twice in the same talent goes through a checkpoint", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("50"));

        await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));
        const stakeBefore = await staking.stakes(investor1.address, talentToken1.address);

        await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));
        const stakeAfter = await staking.stakes(investor1.address, talentToken1.address);

        expect(stakeAfter.lastCheckpointAt).to.be.gt(stakeBefore.lastCheckpointAt);

        expect(stakeBefore.talentAmount).to.eq(parseUnits("250"));
        expect(stakeAfter.talentAmount).to.be.closeTo(parseUnits("500"), margin);
      });

      it("staking twice in different talents does not go through a checkpoint", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("50"));

        await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));
        const stake1Before = await staking.stakes(investor1.address, talentToken1.address);

        await staking.connect(investor1).stakeStable(talentToken2.address, parseUnits("25"));
        const stake1After = await staking.stakes(investor1.address, talentToken1.address);

        const stake2 = await staking.stakes(investor1.address, talentToken1.address);

        expect(stake1After.talentAmount).to.equal(stake2.talentAmount);
        expect(stake1After.tokenAmount).to.equal(stake2.tokenAmount);
        expect(stake1After.tokenAmount).to.equal(stake2.tokenAmount);
        expect(stake1After.lastCheckpointAt).to.eq(stake1Before.lastCheckpointAt);
      });

      it("fails if stake exceeds mintingAvailability", async () => {
        await stable.connect(owner).approve(staking.address, await stable.balanceOf(owner.address));

        const action = staking.connect(owner).stakeStable(talentToken1.address, await stable.balanceOf(owner.address));

        await expect(action).to.be.revertedWith("_amount exceeds minting availability");
      });
    });

    describe("swapStableForToken", () => {
      it("swaps existing stable coin for TAL", async () => {
        const stableAmount = parseUnits("25");
        const tokenAmount = await staking.convertUsdToToken(stableAmount);
        const initialOwnerStableBalance = await stable.balanceOf(owner.address);
        const initialOwnerTalBalance = await tal.balanceOf(owner.address);

        await stable.connect(investor1).approve(staking.address, stableAmount);
        await staking.connect(investor1).stakeStable(talentToken1.address, stableAmount);

        await staking.setToken(tal.address);
        await tal.connect(owner).approve(staking.address, tokenAmount);

        const action = staking.connect(owner).swapStableForToken(stableAmount);

        await expect(action).not.to.be.reverted;

        expect(await tal.balanceOf(staking.address)).to.equal(tokenAmount);
        expect(await tal.balanceOf(owner.address)).to.equal(initialOwnerTalBalance.sub(tokenAmount));

        expect(await stable.balanceOf(staking.address)).to.equal(0);
        expect(await stable.balanceOf(owner.address)).to.equal(initialOwnerStableBalance.add(stableAmount));
      });

      it("deducts totalStableStored", async () => {
        const stableAmount = parseUnits("25");
        const tokenAmount = await staking.convertUsdToToken(stableAmount);

        await stable.connect(investor1).approve(staking.address, stableAmount);
        await staking.connect(investor1).stakeStable(talentToken1.address, stableAmount);
        await staking.setToken(tal.address);

        await tal.connect(owner).approve(staking.address, tokenAmount);

        expect(await staking.totalStableStored()).to.equal(stableAmount);

        await staking.connect(owner).swapStableForToken(parseUnits("15"));

        expect(await staking.totalStableStored()).to.equal(parseUnits("10"));
      });

      it("does not allow non-admins", async () => {
        const action = staking.connect(investor1).swapStableForToken(0);

        await expect(action).to.be.revertedWith(
          `AccessControl: account ${investor1.address.toLowerCase()} is missing role ${await staking.DEFAULT_ADMIN_ROLE()}`
        );
      });

      it("does not accept withdrawing more stable coin than available", async () => {
        const stableAmount = parseUnits("25");
        const tokenAmount = await staking.convertUsdToToken(stableAmount);

        await stable.connect(investor1).approve(staking.address, stableAmount);
        await staking.connect(investor1).stakeStable(talentToken1.address, stableAmount);

        await staking.setToken(tal.address);

        await tal.connect(owner).approve(staking.address, tokenAmount);

        const action = staking.connect(owner).swapStableForToken(parseUnits("50"));

        await expect(action).to.be.revertedWith("not enough stable coin left in the contract");
      });
    });

    describe("claimRewards", () => {
      it("emits a RewardClaim event and updates the stake", async () => {
        const amount = parseUnits("50");
        await enterPhaseTwo();
        await transferAndCall(tal, investor1, staking.address, amount, talentToken1.address);

        ensureTimestamp(end);

        const tx = await staking.connect(investor1).claimRewards(talentToken1.address);

        const event = await findEvent(tx, "RewardClaim");

        expect(event?.args?.owner).to.eq(investor1.address);
        expect(event?.args?.talentToken).to.eq(talentToken1.address);
        expect(event?.args?.stakerReward).to.be.gt(0);
        expect(event?.args?.talentReward).to.be.gt(0);

        expect(event?.args?.stakerReward.add(event?.args?.talentReward)).to.be.closeTo(rewards, margin);

        // updates stake amount
        const stake = await staking.stakes(investor1.address, talentToken1.address);
        expect(stake.tokenAmount).to.eq(amount.add(event?.args?.stakerReward));

        // updates talentRedeeemableShares
        const talentRedeemable = await staking.talentRedeemableRewards(talentToken1.address);
        expect(talentRedeemable).to.equal(event?.args?.talentReward);
      });
    });

    describe("withdrawRewards", () => {
      it("sends rewards to the owner", async () => {
        const amount = parseUnits("50");
        await enterPhaseTwo();
        await transferAndCall(tal, investor1, staking.address, amount, talentToken1.address);

        ensureTimestamp(end);

        const balanceBefore = await tal.balanceOf(investor1.address);
        const tx = await staking.connect(investor1).withdrawRewards(talentToken1.address);
        const balanceAfter = await tal.balanceOf(investor1.address);

        const event = await findEvent(tx, "RewardWithdrawal");

        expect(event?.args?.owner).to.eq(investor1.address);
        expect(event?.args?.talentToken).to.eq(talentToken1.address);
        expect(event?.args?.stakerReward).to.be.gt(0);
        expect(event?.args?.talentReward).to.be.gt(0);

        expect(event?.args?.stakerReward.add(event?.args?.talentReward)).to.be.closeTo(rewards, margin);

        // updates owner's balance
        expect(balanceAfter).to.eq(balanceBefore.add(event?.args?.stakerReward));

        // updates talentRedeeemableShares
        const talentRedeemable = await staking.talentRedeemableRewards(talentToken1.address);
        expect(talentRedeemable).to.equal(event?.args?.talentReward);
      });
    });

    describe("withdrawTalentRewards", () => {
      it("allows talent to withdraw his redeemable share", async () => {
        const amount = parseUnits("50");
        await enterPhaseTwo();
        await transferAndCall(tal, investor1, staking.address, amount, talentToken1.address);

        ensureTimestamp(end);

        const tx = await staking.connect(investor1).withdrawRewards(talentToken1.address);

        const talentRedeemable = await staking.talentRedeemableRewards(talentToken1.address);
        expect(talentRedeemable).to.be.gt(0);

        // updates talentRedeeemableShares
        const balanceBefore = await tal.balanceOf(talent1.address);
        await staking.connect(talent1).withdrawTalentRewards(talentToken1.address);
        const balanceAfter = await tal.balanceOf(talent1.address);

        expect(balanceAfter).to.eq(balanceBefore.add(talentRedeemable));
      });

      it("does not allows talent to withdraw another talent's redeemable share", async () => {
        await enterPhaseTwo();

        const action = staking.connect(talent2).withdrawTalentRewards(talentToken1.address);

        await expect(action).to.be.revertedWith("only the talent can withdraw their own shares");
      });
    });

    describe("stakingAvailability", () => {
      it("shows how much TAL can be staked in a token", async () => {
        await enterPhaseTwo();

        const amount = parseUnits("50");
        const amountBefore = await staking.stakeAvailability(talentToken1.address);
        await transferAndCall(tal, investor1, staking.address, amount, talentToken1.address);
        const amountAfter = await staking.stakeAvailability(talentToken1.address);

        expect(amountAfter).to.equal(amountBefore.sub(amount));

        expect(amountAfter).to.eq(await staking.convertTalentToToken(await talentToken1.mintingAvailability()));
      });

      it("corresponds to the talent token amount converted to TAL according to the rate", async () => {
        await enterPhaseTwo();

        const amount = parseUnits("50");

        const amountBefore = await staking.stakeAvailability(talentToken1.address);
        expect(amountBefore).to.eq(await staking.convertTalentToToken(await talentToken1.mintingAvailability()));

        await transferAndCall(tal, investor1, staking.address, amount, talentToken1.address);

        const amountAfter = await staking.stakeAvailability(talentToken1.address);
        expect(amountAfter).to.eq(await staking.convertTalentToToken(await talentToken1.mintingAvailability()));
      });
    });

    describe("ERC1363Receiver", () => {
      describe("onTransferReceived", () => {
        describe("TAL stakes", () => {
          it("creates a stake", async () => {
            await staking.setToken(tal.address);

            await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);

            const stake = await staking.stakes(investor1.address, talentToken1.address);

            expect(stake.tokenAmount).to.equal(parseUnits("50"));
          });

          it("allows creating stakes in different talents", async () => {
            await staking.setToken(tal.address);

            await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);
            await transferAndCall(tal, investor1, staking.address, parseUnits("100"), talentToken2.address);

            const stake1 = await staking.stakes(investor1.address, talentToken1.address);
            const stake2 = await staking.stakes(investor1.address, talentToken2.address);

            expect(stake1.tokenAmount).to.equal(parseUnits("50"));

            expect(stake2.tokenAmount).to.equal(parseUnits("100"));
          });

          it("emits the expected Stake event", async () => {
            await staking.setToken(tal.address);

            const action = transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);

            await expect(action)
              .to.emit(staking, "Stake")
              .withArgs(investor1.address, talentToken1.address, parseUnits("50"), false);
          });

          it("updates totalTokensStaked", async () => {
            await staking.setToken(tal.address);

            await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);
            expect(await staking.totalTokensStaked()).to.equal(parseUnits("50"));

            await transferAndCall(tal, investor1, staking.address, parseUnits("100"), talentToken2.address);
            expect(await staking.totalTokensStaked()).to.equal(parseUnits("150"));
          });

          it("rejects TAL stakes while not yet", async () => {
            const action = transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);

            await expect(action).to.be.revertedWith("Unrecognized ERC1363 token received");
          });

          it("fails if stake exceeds mintingAvailability", async () => {
            await staking.setToken(tal.address);

            const action = transferAndCall(
              tal,
              owner,
              staking.address,
              await tal.balanceOf(owner.address),
              talentToken1.address
            );

            await expect(action).to.be.revertedWith("_amount exceeds minting availability");
          });

          it("accepts TAL stakes in the second phase", async () => {
            await staking.setToken(tal.address);

            const investorTalBalanceBefore = await tal.balanceOf(investor1.address);
            const action = transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);

            await expect(action).not.to.be.reverted;

            // TAL is deducted
            expect(await tal.balanceOf(investor1.address)).to.eq(investorTalBalanceBefore.sub(parseUnits("50")));

            const talentBalance = await talentToken1.balanceOf(investor1.address);
            const expectedBalance = await staking.convertTokenToTalent(parseUnits("50"));

            // // NAPS is credited
            expect(talentBalance).to.equal(expectedBalance);
            expect(talentBalance).not.to.equal(parseUnits("0"));
          });
        });

        describe("Talent Token refunds", () => {
          it("rejects tokens while TAL is not yet set", async () => {
            const action = transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);

            await expect(action).to.be.revertedWith("Unrecognized ERC1363 token received");
          });

          it("accepts Talent Tokens in the second phase, to refund a TAL investment", async () => {
            await enterPhaseTwo();

            // mint new NAPS
            await transferAndCall(tal, investor1, staking.address, parseUnits("5"), talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const investorTalBalanceBefore = await tal.balanceOf(investor1.address);
            await transferAndCall(talentToken1, investor1, staking.address, parseUnits("1"), null);

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
            await transferAndCall(tal, investor1, staking.address, amount, talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const action = transferAndCall(talentToken1, investor1, staking.address, parseUnits("1"), null);

            await expect(action).to.emit(staking, "Unstake");
          });

          it("deducts from totalTokensStaked", async () => {
            await enterPhaseTwo();

            // mint new NAPS
            await transferAndCall(tal, investor1, staking.address, parseUnits("5"), talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const totalBefore = await staking.totalTokensStaked();
            await transferAndCall(talentToken1, investor1, staking.address, parseUnits("0.5"), null);
            const totalAfter = await staking.totalTokensStaked();

            expect(totalAfter).to.be.closeTo(totalBefore.sub(parseUnits("2.5")), margin);
          });

          it("performs a checkpoint and keeps a stake with the remainder", async () => {
            await enterPhaseTwo();

            // mint new NAPS
            await transferAndCall(tal, investor1, staking.address, parseUnits("10"), talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("2"));

            const investorTalBalanceBefore = await tal.balanceOf(investor1.address);
            await transferAndCall(talentToken1, investor1, staking.address, parseUnits("1"), null);

            // proportional amount of TAL is returned
            expect(await tal.balanceOf(investor1.address)).to.be.closeTo(
              investorTalBalanceBefore.add(parseUnits("5")),
              margin
            );

            // remaining TAL is still staked
            const stakeAfter = await staking.stakes(investor1.address, talentToken1.address);
            expect(stakeAfter.tokenAmount).to.be.closeTo(parseUnits("5"), margin);
          });
        });
      });
    });

    describe("stableCoinBalance", () => {
      it("returns the amount of stable coin held", async () => {
        await stable.connect(investor1).transfer(staking.address, parseUnits("1"));
        await stable.connect(investor1).transfer(staking.address, parseUnits("2.5"));

        expect(await staking.stableCoinBalance()).to.equal(parseUnits("3.5"));
      });
    });

    describe("tokenBalance", () => {
      it("returns the amount of tokens held", async () => {
        await staking.setToken(tal.address);

        await tal.connect(investor1).transfer(staking.address, parseUnits("1"));
        await tal.connect(investor1).transfer(staking.address, parseUnits("2.5"));

        expect(await staking.tokenBalance()).to.equal(parseUnits("3.5"));
      });
    });

    describe("convertUsdToToken", () => {
      it("converts a USD value to TAL based on given rate", async () => {
        expect(await staking.convertUsdToToken(parseUnits("1"))).to.equal(parseUnits("50"));
      });
    });

    describe("convertTokenToTalent", () => {
      it("converts a TAL value to a talent token based on a given rate", async () => {
        expect(await staking.convertTokenToTalent(parseUnits("5"))).to.equal(parseUnits("1"));
      });
    });

    describe("convertTalentToToken", () => {
      it("converts a Talent token value to TAL based on a given rate", async () => {
        expect(await staking.convertTalentToToken(parseUnits("1"))).to.equal(parseUnits("5"));
      });
    });

    describe("convertUsdToTalent", () => {
      it("converts a USD value to a talent token based on both given rates", async () => {
        expect(await staking.convertUsdToTalent(parseUnits("2"))).to.equal(parseUnits("20"));
      });
    });

    describe("activeStakes", () => {
      it("increments with a stable coin stake", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("25"));
        await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));

        expect(await staking.activeStakes()).to.equal(1);

        await stable.connect(investor2).approve(staking.address, parseUnits("25"));
        await staking.connect(investor2).stakeStable(talentToken1.address, parseUnits("25"));

        expect(await staking.activeStakes()).to.equal(2);
      });

      it("increments with a TAL stake", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);
        expect(await staking.activeStakes()).to.equal(1);
        await transferAndCall(tal, investor2, staking.address, parseUnits("50"), talentToken2.address);
        expect(await staking.activeStakes()).to.equal(2);
      });

      it("does not count duplicates if same stake is reinforced", async () => {
        await staking.setToken(tal.address);

        await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);
        expect(await staking.activeStakes()).to.equal(1);
        await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);
        expect(await staking.activeStakes()).to.equal(1);
      });

      it("counts twice duplicates if same investor stakes in two talents", async () => {
        await staking.setToken(tal.address);

        await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);
        expect(await staking.activeStakes()).to.equal(1);
        await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken2.address);
        expect(await staking.activeStakes()).to.equal(2);
      });

      it("decrements if a full refund is requested", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, staking.address, parseUnits("5"), talentToken1.address);
        expect(await staking.activeStakes()).to.equal(1);
        await transferAndCall(talentToken1, investor1, staking.address, parseUnits("1"), null);
        expect(await staking.activeStakes()).to.equal(0);
      });

      it("decrements if two full refunds are requested", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, staking.address, parseUnits("5"), talentToken1.address);
        expect(await staking.activeStakes()).to.equal(1);
        await transferAndCall(talentToken1, investor1, staking.address, parseUnits("1"), null);
        expect(await staking.activeStakes()).to.equal(0);

        await transferAndCall(tal, investor1, staking.address, parseUnits("5"), talentToken1.address);
        expect(await staking.activeStakes()).to.equal(1);
        await transferAndCall(talentToken1, investor1, staking.address, parseUnits("1"), null);
        expect(await staking.activeStakes()).to.equal(0);
      });

      it("does not decrement if a partial refund is requested", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, staking.address, parseUnits("5"), talentToken1.address);

        expect(await staking.activeStakes()).to.equal(1);
        await transferAndCall(talentToken1, investor1, staking.address, parseUnits("0.5"), null);
        expect(await staking.activeStakes()).to.equal(1);

        // refundind the remaining 50% decrements
        const balance = await talentToken1.balanceOf(investor1.address)

        await transferAndCall(talentToken1, investor1, staking.address, balance, null);
        expect(await staking.activeStakes()).to.equal(0);
      });
    });

    describe("disable", () => {
      it("disables staking", async () => {
        await staking.disable();

        expect(await staking.disabled());
      });

      it("is only callable by an admin", async () => {
        const action = staking.connect(investor1).disable();

        expect(action).to.be.reverted;
      });

      it("prevents further stakes", async () => {
        await enterPhaseTwo();
        await staking.disable();

        const action = transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);

        await expect(action).to.be.revertedWith("staking has been disabled");
      });

      it("allows withdraws from existing stakes", async () => {
        await enterPhaseTwo();

        await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);

        const action = transferAndCall(talentToken1, investor1, staking.address, parseUnits("0.5"), null);

        expect(action).not.to.be.reverted;
      });
    });

    describe("adminWithdraw", () => {
      it("withdraws all remaining rewards", async () => {
        await enterPhaseTwo();
        await staking.disable();

        const rewards = await staking.rewardsLeft();

        const balanceBefore = await tal.balanceOf(owner.address);
        await staking.adminWithdraw();
        const balanceAfter = await tal.balanceOf(owner.address);

        expect(rewards).to.be.gt(0);
        expect(balanceAfter).to.equal(balanceBefore.add(rewards));
        expect(await tal.balanceOf(staking.address)).to.equal(0);
        expect(await staking.rewardsLeft()).to.equal(0);
      });

      it("is only callable by an admin", async () => {
        const action = staking.connect(investor1).adminWithdraw();

        expect(action).to.be.reverted;
      });

      it("is not callable if there's nothing to withdraw", async () => {
        await enterPhaseTwo();
        await staking.disable();
        await staking.adminWithdraw();

        const action = staking.adminWithdraw();

        await expect(action).to.be.revertedWith("nothing left to withdraw");
      });

      it("is not callable if there is an active stake", async () => {
        await enterPhaseTwo();
        await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);
        await staking.disable();

        const action = staking.adminWithdraw();

        await expect(action).to.be.revertedWith(
          "there are still stakes accumulating rewards. Call `claimRewardsOnBehalf` on them"
        );
      });
    });

    describe("setTokenPrice", () => {
      it("is callable by an admin", async () => {
        const action = await staking.connect(owner).setTokenPrice(parseUnits("1"));
        
        expect(await staking.tokenPrice()).to.eq(parseUnits("1"));
      })

      it("is not callable by a random user", async () => {
        const action = staking.connect(investor1).setTokenPrice(parseUnits("1"));

        await expect(action).to.be.revertedWith(
          `AccessControl: account ${investor1.address.toLowerCase()} is missing role ${await staking.DEFAULT_ADMIN_ROLE()}`
        );
      })

      it("changes the token price", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("1"));

        await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));
        expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("10"));

        await staking.connect(owner).setTokenPrice(parseUnits("0.2"));

        await stable.connect(investor2).approve(staking.address, parseUnits("1"));

        await staking.connect(investor2).stakeStable(talentToken1.address, parseUnits("1"));
        expect(await talentToken1.balanceOf(investor2.address)).to.equal(parseUnits("1"));
      })
    })
  });
});
