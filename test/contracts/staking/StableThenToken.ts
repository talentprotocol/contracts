import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import { TestStableThenToken } from "../../../typechain/TestStableThenToken";
import TestStableThenTokenArtifact from "../../../artifacts/contracts/test/TestStableThenToken.sol/TestStableThenToken.json";

import { ERC20 } from "../../../typechain/ERC20";
import ERC20MockArtifact from "../../../artifacts/contracts/test/ERC20Mock.sol/ERC20Mock.json";
import ERC20MockWithoutErc165Artifact from "../../../artifacts/contracts/test/ERC20Mock.sol/ERC20MockWithoutErc165.json";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("StableThenToken", () => {
  let owner: any;

  let stable: ERC20;
  let token: ERC20;
  let contract: TestStableThenToken;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];

    stable = (await deployContract(owner, ERC20MockArtifact, [
      "Stable Coin",
      "USDT",
    ])) as ERC20;
    token = (await deployContract(owner, ERC20MockArtifact, [
      "TalentProtocol",
      "TAL",
    ])) as ERC20;
  });

  describe("constructor", () => {
    it("works with valid arguments", async () => {
      const contract = (await deployContract(
        owner,
        TestStableThenTokenArtifact,
        [stable.address, 50]
      )) as TestStableThenToken;

      expect(await contract.stableCoin()).to.eq(stable.address);
      expect(await contract.token()).to.hexEqual("0x0");
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      contract = (await deployContract(owner, TestStableThenTokenArtifact, [
        stable.address,
        50,
      ])) as TestStableThenToken;
    });

    describe("setToken", () => {
      it("accepts an ERC20 with symbol TAL", async () => {
        await expect(contract.setToken(token.address)).not.to.be.reverted;
      });

      it("does not accept a token with another name", async () => {
        await expect(contract.setToken(stable.address)).to.be.revertedWith(
          "token name is not TAL"
        );
      });

      it("does not accept a token not implementing ERC20's interfaceId", async () => {
        const token = await deployContract(
          owner,
          ERC20MockWithoutErc165Artifact,
          ["Talent Protocol", "TAL"]
        );

        const action = contract.setToken(token.address);

        await expect(action).to.be.revertedWith("not a valid ERC20 token");
      });
    });

    describe("stablePhaseOnly", () => {
      it("works while in stable phase", async () => {
        await expect(contract.test_stablePhaseOnly()).not.to.be.reverted;
      });

      it("fails while in token phase", async () => {
        await contract.setToken(token.address);

        await expect(contract.test_stablePhaseOnly()).to.be.revertedWith(
          "Stable coin disabled"
        );
      });
    });

    describe("talPhaseOnly", () => {
      it("works while in tal phase", async () => {
        await contract.setToken(token.address);

        await expect(contract.test_tokenPhaseOnly()).not.to.be.reverted;
      });
      it("fails while in stable phase", async () => {
        await expect(contract.test_tokenPhaseOnly()).to.be.revertedWith(
          "TAL token not yet set"
        );
      });
    });

    describe("convertUsdToToken", () => {
      it("converts a USD value to TAL based on given rate", async () => {
        expect(await contract.test_convertUsdToToken(50)).to.equal(1);
      });
    });
  });
});
