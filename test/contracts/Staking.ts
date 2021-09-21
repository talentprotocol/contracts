import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { TalentProtocol } from "../../typechain/TalentProtocol";
import TalentProtocolArtifact from "../../artifacts/contracts/TalentProtocol.sol/TalentProtocol.json";

import { USDTMock } from "../../typechain/USDTMock";
import USDTArtifact from "../../artifacts/contracts/test/ERC20Mock.sol/USDTMock.json";

import { TalentFactory } from "../../typechain/TalentFactory";
import TalentFactoryArtifact from "../../artifacts/contracts/TalentFactory.sol/TalentFactory.json";

import { TalentToken } from "../../typechain/TalentToken";

import { Staking } from "../../typechain/Staking";
import StakingArtifact from "../../artifacts/contracts/Staking.sol/Staking.json";

import { deployTalentToken, transferAndCall } from "../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("Staking", () => {
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;

  let tal: TalentProtocol;
  let stable: USDTMock;
  let talentToken: TalentToken;
  let factory: TalentFactory;
  let staking: Staking;

  beforeEach(async () => {
    [owner, minter, talent, investor1, investor2] = await ethers.getSigners();

    stable = (await deployContract(owner, USDTArtifact, [])) as USDTMock;

    await stable.connect(owner).transfer(investor1.address, parseUnits("50"));
    await stable.connect(owner).transfer(investor2.address, parseUnits("50"));

    tal = (await deployContract(owner, TalentProtocolArtifact, [])) as TalentProtocol;
    // tal.transferAndCall(investor1.address, parseUnits("1"));

    await tal.connect(owner).transfer(investor1.address, parseUnits("50"));
    await tal.connect(owner).transfer(investor2.address, parseUnits("50"));

    factory = (await deployContract(owner, TalentFactoryArtifact, [])) as TalentFactory;
  });

  describe("constructor", () => {
    it("works with valid arguments", async () => {
      const action = deployContract(owner, StakingArtifact, [
        stable.address,
        factory.address,
        parseUnits("0.02"),
        parseUnits("50"),
      ]);

      await expect(action).not.to.be.reverted;
    });

    it("fails if protocolPrice is 0", async () => {
      const action = deployContract(owner, StakingArtifact, [
        stable.address,
        factory.address,
        parseUnits("0"),
        parseUnits("50"),
      ]);

      await expect(action).to.be.revertedWith("_protocolPrice cannot be 0");
    });

    it("fails if talentPrice is 0", async () => {
      const action = deployContract(owner, StakingArtifact, [
        stable.address,
        factory.address,
        parseUnits("0.5"),
        parseUnits("0"),
      ]);

      await expect(action).to.be.revertedWith("_talentPrice cannot be 0");
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      staking = (await deployContract(owner, StakingArtifact, [
        stable.address,
        factory.address,
        parseUnits("0.02"),
        parseUnits("50"),
      ])) as Staking;

      await factory.setMinter(staking.address);

      talentToken = await deployTalentToken(factory, minter, talent);
    });

    async function enterPhaseTwo() {
      await staking.setToken(tal.address);
      await tal.connect(owner).transfer(staking.address, parseUnits("400"));
    }

    describe("stakeStable", () => {
      it("accepts stable coin stakes", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("25"));

        const action = staking.connect(investor1).stakeStable(talentToken.address, parseUnits("25"));

        await expect(action).not.to.be.reverted;

        // USDT is deducted
        expect(await stable.balanceOf(investor1.address)).to.eq(parseUnits("25"));

        const talentBalance = await talentToken.balanceOf(investor1.address);
        const expectedBalance = await staking.convertUsdToTalent(parseUnits("25"));

        // NAPS is credited
        expect(talentBalance).to.equal(expectedBalance);
        expect(talentBalance).not.to.equal(parseUnits("0"));
      });

      it("does not accept stable coin stakes while in phase2", async () => {
        await stable.connect(investor1).approve(staking.address, parseUnits("1"));
        await staking.setToken(tal.address);

        const action = staking.connect(investor1).stakeStable(talentToken.address, parseUnits("1"));

        await expect(action).to.be.revertedWith("Stable coin disabled");
      });
    });

    describe("ERC1363Receiver", () => {
      describe("onTransferReceived", () => {
        describe("TAL stakes", () => {
          it("rejects TAL stakes while not yet", async () => {
            const action = transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken.address);

            await expect(action).to.be.revertedWith("Unrecognized ERC20 token received");
          });

          it("accepts TAL stakes in the second phase", async () => {
            await staking.setToken(tal.address);

            const action = transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken.address);

            await expect(action).not.to.be.reverted;

            // TAL is deducted
            expect(await tal.balanceOf(investor1.address)).to.eq(parseUnits("0"));

            const talentBalance = await talentToken.balanceOf(investor1.address);
            const expectedBalance = await staking.convertProtocolToTalent(parseUnits("50"));

            // // NAPS is credited
            expect(talentBalance).to.equal(expectedBalance);
            expect(talentBalance).not.to.equal(parseUnits("0"));
          });
        });

        describe("Talent Token refunds", () => {
          it("rejects tokens while TAL is not yet set", async () => {
            const action = transferAndCall(talentToken, talent, staking.address, parseUnits("50"), talentToken.address);

            await expect(action).to.be.revertedWith("TAL token not yet set. Refund not possible");
          });

          it("accepts Talent Tokens in the second phase, to refund a TAL investment", async () => {
            await enterPhaseTwo();

            // mint new NAPS
            await transferAndCall(tal, investor1, staking.address, parseUnits("50"), talentToken.address);
            expect(await talentToken.balanceOf(investor1.address)).to.equal(parseUnits("1"));

            const action = transferAndCall(talentToken, investor1, staking.address, parseUnits("1"), null);

            await expect(action).not.to.be.reverted;

            // NAPS is burned
            expect(await talentToken.balanceOf(investor1.address)).to.equal(parseUnits("0"));

            // TAL is returned
            expect(await tal.balanceOf(investor1.address)).to.equal(parseUnits("50"));
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

    describe("convertUsdToProtocol", () => {
      it("converts a USD value to TAL based on given rate", async () => {
        expect(await staking.convertUsdToProtocol(parseUnits("1"))).to.equal(parseUnits("50"));
      });
    });

    describe("convertProtocolToTalent", () => {
      it("converts a TAL value to a talent token based on a given rate", async () => {
        expect(await staking.convertProtocolToTalent(parseUnits("50"))).to.equal(parseUnits("1"));
      });
    });

    describe("convertTalentToProtocol", () => {
      it("converts a Talent token value to TAL based on a given rate", async () => {
        expect(await staking.convertTalentToProtocol(parseUnits("1"))).to.equal(parseUnits("50"));
      });
    });

    describe("convertUsdToTalent", () => {
      it("converts a USD value to a talent token based on both given rates", async () => {
        expect(await staking.convertUsdToTalent(parseUnits("2"))).to.equal(parseUnits("2"));
      });
    });
  });
});
