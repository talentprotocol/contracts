import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TalentProtocol, USDTMock, TalentFactory, Staking, TalentToken } from "../../typechain";

import { ERC165, Artifacts } from "../shared";
import { deployTalentToken, transferAndCall } from "../shared/utils";

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

  const start = dayjs().add(-1, "day").unix();
  const end = dayjs().add(1, "day").unix();
  const noRewards = parseUnits("0");

  beforeEach(async () => {
    [owner, minter, talent1, talent2, investor1, investor2] = await ethers.getSigners();

    stable = (await deployContract(owner, Artifacts.USDTMock, [])) as USDTMock;

    await stable.connect(owner).transfer(investor1.address, parseUnits("10000"));
    await stable.connect(owner).transfer(investor2.address, parseUnits("10000"));

    tal = (await deployContract(owner, Artifacts.TalentProtocol, [])) as TalentProtocol;

    await tal.connect(owner).transfer(investor1.address, parseUnits("1000"));
    await tal.connect(owner).transfer(investor2.address, parseUnits("1000"));

    factory = (await deployContract(owner, Artifacts.TalentFactory, [])) as TalentFactory;
  });

  describe("constructor", () => {
    it("works with valid arguments", async () => {
      const action = deployContract(owner, Artifacts.Staking, [
        start,
        end,
        noRewards,
        stable.address,
        factory.address,
        parseUnits("0.02"),
        parseUnits("50"),
      ]);

      await expect(action).not.to.be.reverted;
    });

    it("fails if tokenPrice is 0", async () => {
      const action = deployContract(owner, Artifacts.Staking, [
        start,
        end,
        noRewards,
        stable.address,
        factory.address,
        parseUnits("0"),
        parseUnits("50"),
      ]);

      await expect(action).to.be.revertedWith("_tokenPrice cannot be 0");
    });

    it("fails if talentPrice is 0", async () => {
      const action = deployContract(owner, Artifacts.Staking, [
        start,
        end,
        noRewards,
        stable.address,
        factory.address,
        parseUnits("0.5"),
        parseUnits("0"),
      ]);

      await expect(action).to.be.revertedWith("_talentPrice cannot be 0");
    });
  });

  const builder = async (): Promise<Staking> => {
    return deployContract(owner, Artifacts.Staking, [
      start,
      end,
      noRewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("50"),
    ]) as Promise<Staking>;
  };

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IAccessControl"]);
  });

  describe("functions", () => {
    beforeEach(async () => {
      staking = await builder();

      await factory.setMinter(staking.address);

      talentToken1 = await deployTalentToken(factory, minter, talent1, "Miguel Palhas", "NAPS");
      talentToken2 = await deployTalentToken(factory, minter, talent2, "Francisco Leal", "LEAL");
    });

    async function enterPhaseTwo() {
      await staking.setToken(tal.address);
      await tal.connect(owner).transfer(staking.address, parseUnits("400"));
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

        expect(stakeBefore.talentAmount).to.equal(parseUnits("25"));
        expect(stakeAfter.talentAmount).to.equal(parseUnits("50"));
      });

      it("staking twice in different talents does not go through a checkpoint", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("50"));

        await staking.connect(investor1).stakeStable(talentToken1.address, parseUnits("25"));
        const stake1Before = await staking.stakes(investor1.address, talentToken1.address);

        await staking.connect(investor1).stakeStable(talentToken2.address, parseUnits("25"));
        const stake1After = await staking.stakes(investor1.address, talentToken2.address);

        const stake2 = await staking.stakes(investor1.address, talentToken1.address);

        expect(stake1After.talentAmount).to.equal(stake2.talentAmount);
        expect(stake1After.tokenAmount).to.equal(stake2.tokenAmount);
        expect(stake1After.tokenAmount).to.equal(stake2.tokenAmount);
        expect(stake1After.lastCheckpointAt).to.be.gt(stake1Before.lastCheckpointAt);
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
            await transferandcall(tal, investor1, staking.address, parseunits("50"), talenttoken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const investorTalBalanceBefore = await tal.balanceOf(investor1.address);
            await transferAndCall(talentToken1, investor1, staking.address, parseUnits("1"), null);

            // NAPS is burned
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("0"));

            // TAL is returned
            expect(await tal.balanceOf(investor1.address)).to.equal(investorTalBalanceBefore.add(parseUnits("50")));
          });

          it("emits the expected Stake event", async () => {
            await staking.setToken(tal.address);

            // mint new NAPS
            await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const action = transferAndCall(talentToken1, investor1, staking.address, parseUnits("1"), null);

            await expect(action)
              .to.emit(staking, "Unstake")
              .withArgs(investor1.address, talentToken1.address, parseUnits("50"));
          });

          it("deducts from totalTokensStaked", async () => {
            await enterPhaseTwo();

            // mint new NAPS
            await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const totalBefore = await staking.totalTokensStaked();
            await transferAndCall(talentToken1, investor1, staking.address, parseUnits("0.5"), null);
            const totalAfter = await staking.totalTokensStaked();

            expect(totalAfter).to.equal(totalBefore.sub(parseUnits("25")));
          });

          it("performs a checkpoint and keeps a stake with the remainder", async () => {
            await enterPhaseTwo();

            // mint new NAPS
            await transferAndCall(tal, investor1, staking.address, parseUnits("100"), talentToken1.address);
            expect(await talentToken1.balanceOf(investor1.address)).to.equal(parseUnits("2"));

            const investorTalBalanceBefore = await tal.balanceOf(investor1.address);
            await transferAndCall(talentToken1, investor1, staking.address, parseUnits("1"), null);

            // proportional amount of TAL is returned
            expect(await tal.balanceOf(investor1.address)).to.equal(investorTalBalanceBefore.add(parseUnits("50")));

            // remaining TAL is still staked
            const stakeAfter = await staking.stakes(investor1.address, talentToken1.address);
            expect(stakeAfter.tokenAmount).to.equal(parseUnits("50"));
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
        expect(await staking.convertTokenToTalent(parseUnits("50"))).to.equal(parseUnits("1"));
      });
    });

    describe("convertTalentToToken", () => {
      it("converts a Talent token value to TAL based on a given rate", async () => {
        expect(await staking.convertTalentToToken(parseUnits("1"))).to.equal(parseUnits("50"));
      });
    });

    describe("convertUsdToTalent", () => {
      it("converts a USD value to a talent token based on both given rates", async () => {
        expect(await staking.convertUsdToTalent(parseUnits("2"))).to.equal(parseUnits("2"));
      });
    });

    describe("stakeAvailability", () => {
      it("calculates how much TAL is stakeable in a talent", async () => {
        await enterPhaseTwo();

        const availabilityBefore = await staking.stakeAvailability(talentToken1.address);
        await transferAndCall(tal, investor1, staking.address, parseUnits("100"), talentToken1.address);
        const availabilityAfter = await staking.stakeAvailability(talentToken1.address);

        expect(availabilityAfter).to.equal(availabilityBefore.sub(parseUnits("100")));
      });
    });
  });
});
