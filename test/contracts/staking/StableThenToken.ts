import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { ERC20, TestStableThenToken } from "../../../typechain";
import { Artifacts } from "../../shared";

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

    stable = (await deployContract(owner, Artifacts.ERC20Mock, ["Stable Coin", "USDT"])) as ERC20;
    token = (await deployContract(owner, Artifacts.ERC20Mock, ["TalentProtocol", "TAL"])) as ERC20;
  });

  describe("constructor", () => {
    it("works with valid arguments", async () => {
      const contract = (await deployContract(owner, Artifacts.TestStableThenToken, [
        stable.address,
      ])) as TestStableThenToken;

      expect(await contract.stableCoin()).to.eq(stable.address);
      expect(await contract.token()).to.hexEqual("0x0");
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      contract = (await deployContract(owner, Artifacts.TestStableThenToken, [stable.address])) as TestStableThenToken;
    });

    describe("setToken", () => {
      it("accepts an ERC20 with symbol TAL", async () => {
        await expect(contract.setToken(token.address)).not.to.be.reverted;
      });

      it("does not accept a token with another name", async () => {
        await expect(contract.setToken(stable.address)).to.be.revertedWith("token name is not TAL");
      });

      it("does not accept a token not implementing ERC20's interfaceId", async () => {
        const token = await deployContract(owner, Artifacts.ERC20MockWithoutErc165, ["Talent Protocol", "TAL"]);

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

        await expect(contract.test_stablePhaseOnly()).to.be.revertedWith("Stable coin disabled");
      });
    });

    describe("talPhaseOnly", () => {
      it("works while in tal phase", async () => {
        await contract.setToken(token.address);

        await expect(contract.test_tokenPhaseOnly()).not.to.be.reverted;
      });
      it("fails while in stable phase", async () => {
        await expect(contract.test_tokenPhaseOnly()).to.be.revertedWith("TAL token not yet set");
      });
    });
  });
});
