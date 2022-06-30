import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { ERC20, TestStableThenToken } from "../../../typechain";
import { Artifacts } from "../../shared";


chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("StableThenToken", () => {
  let owner: any;
  let investor: any;

  let stable: ERC20;
  let token: ERC20;
  let contract: TestStableThenToken;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];
    investor = signers[1];

    stable = (await deployContract(owner, Artifacts.ERC20Mock, ["Stable Coin", "USDT"])) as ERC20;
    token = (await deployContract(owner, Artifacts.ERC20Mock, ["TalentProtocol", "TAL"])) as ERC20;
  });

  describe("constructor", () => {
    it("works with valid arguments", async () => {
      const TestStableThenTokenContract = await ethers.getContractFactory("TestStableThenToken");
      contract = (await upgrades.deployProxy(TestStableThenTokenContract, [stable.address])) as TestStableThenToken;
      await contract.deployed();

      expect(await contract.stableCoin()).to.eq(stable.address);
      expect(await contract.token()).to.hexEqual("0x0");
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      const TestStableThenTokenContract = await ethers.getContractFactory("TestStableThenToken");
      contract = (await upgrades.deployProxy(TestStableThenTokenContract, [stable.address])) as TestStableThenToken;
      await contract.deployed();
    });

    describe("setToken", () => {
      it("only allows the admin to set the token", async () => {
        const action = contract.connect(investor).setToken(token.address);

        await expect(action).to.be.revertedWith(
          `AccessControl: account ${investor.address.toLowerCase()} is missing role ${await contract.DEFAULT_ADMIN_ROLE()}`
        );
      });

      it("accepts an ERC20 with symbol TAL", async () => {
        await expect(contract.connect(owner).setToken(token.address)).not.to.be.reverted;
      });

      it("does not accept a token with another name", async () => {
        await expect(contract.connect(owner).setToken(stable.address)).to.be.revertedWith("token name is not TAL");
      });

      it("does not accept a token not implementing ERC20's interfaceId", async () => {
        const token = await deployContract(owner, Artifacts.ERC20MockWithoutErc165, ["Talent Protocol", "TAL"]);

        const action = contract.connect(owner).setToken(token.address);

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
