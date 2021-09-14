import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { TalentProtocol as TAL } from "../../typechain/TalentProtocol";
import TALArtifacth from "../../artifacts/contracts/TalentProtocol.sol/TalentProtocol.json";

import { USDTMock } from "../../typechain/USDTMock";
import USDTArtifact from "../../artifacts/contracts/test/ERC20Mock.sol/USDTMock.json";
import TALArtifact from "../../artifacts/contracts/TalentProtocol.sol/TalentProtocol.json";

import { Staking } from "../../typechain/Staking";
import StakingArtifact from "../../artifacts/contracts/Staking.sol/Staking.json";

chai.use(solidity);

const { expect } = chai;
const { parseEther } = ethers.utils;
const { deployContract } = waffle;

describe("Staking", () => {
  let owner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;

  let tal: TAL;
  let stable: USDTMock;
  let staking: Staking;

  beforeEach(async () => {
    [owner, investor1, investor2] = await ethers.getSigners();

    stable = (await deployContract(owner, USDTArtifact, [])) as USDTMock;

    await stable.connect(owner).transfer(investor1.address, parseEther("50"));
    await stable.connect(owner).transfer(investor2.address, parseEther("50"));

    tal = (await deployContract(owner, TALArtifact, [])) as TAL;

    await tal.connect(owner).transfer(investor1.address, parseEther("50"));
    await tal.connect(owner).transfer(investor2.address, parseEther("50"));
  });

  describe("constructor", () => {
    it("works with valid arguments", async () => {
      const action = deployContract(owner, StakingArtifact, [stable.address, 50]);

      await expect(action).not.to.be.reverted;
    });

    it("fails if tokenPrice is 0", async () => {
      const action = deployContract(owner, StakingArtifact, [stable.address, 0]);

      await expect(action).to.be.revertedWith("_tokenPrice cannot be 0");
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      staking = (await deployContract(owner, StakingArtifact, [stable.address, 50])) as Staking;
    });

    describe("stakeStable", () => {
      it("accepts stable coin stakes", async () => {
        await stable.connect(investor1).approve(staking.address, parseEther("1"));

        const action = staking.connect(investor1).stakeStable(parseEther("1"));

        await expect(action).not.to.be.reverted;
      });

      it("does not accept stable coin stakes while in phase2", async () => {
        await stable.connect(investor1).approve(staking.address, parseEther("1"));
        await staking.setToken(tal.address);

        const action = staking.connect(investor1).stakeStable(parseEther("1"));

        await expect(action).to.be.revertedWith("Stable coin disabled");
      });
    });

    describe("stakeToken", () => {
      it("accepts token stakes after TAL token is set", async () => {
        await tal.connect(investor1).approve(staking.address, parseEther("1"));
        await staking.setToken(tal.address);

        const action = staking.connect(investor1).stakeToken(parseEther("1"));

        await expect(action).not.to.be.reverted;
      });

      it("does not accept TAL while still in phase 1", async () => {
        await tal.connect(investor1).approve(staking.address, parseEther("1"));

        const action = staking.connect(investor1).stakeToken(parseEther("1"));

        await expect(action).to.be.revertedWith("TAL token not yet set");
      });
    });

    describe("stableCoinBalance", () => {
      it("returns the amount of stable coin held", async () => {
        await stable.connect(investor1).transfer(staking.address, parseEther("1"));
        await stable.connect(investor1).transfer(staking.address, parseEther("2.5"));

        expect(await staking.stableCoinBalance()).to.equal(parseEther("3.5"));
      });
    });

    describe("tokenBalance", () => {
      it("returns the amount of tokens held", async () => {
        await staking.setToken(tal.address);

        await tal.connect(investor1).transfer(staking.address, parseEther("1"));
        await tal.connect(investor1).transfer(staking.address, parseEther("2.5"));

        expect(await staking.tokenBalance()).to.equal(parseEther("3.5"));
      });
    });
  });
});
