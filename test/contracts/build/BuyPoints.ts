import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ERC20Mock, BuyPoints } from "../../../typechain-types";
import { Artifacts } from "../../shared";

import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("BuyPoints", () => {
  let admin: SignerWithAddress;
  let buyer: SignerWithAddress;
  let safe: SignerWithAddress;

  let contract: BuyPoints;
  let build: ERC20Mock;

  beforeEach(async () => {
    [admin, buyer, safe] = await ethers.getSigners();

    build = (await deployContract(admin, Artifacts.ERC20Mock, ["Build", "BUILD"])) as ERC20Mock;

    await build.connect(admin).transfer(buyer.address, parseUnits("10000"));
  });

  async function builder() {
    return deployContract(admin, Artifacts.BuyPoints, [admin.address, safe.address, build.address]);
  }

  describe("behaviour", () => {
    beforeEach(async () => {
      contract = (await builder()) as BuyPoints;
    });

    it("is created with no state", async () => {
      expect(await contract.totalBuys()).to.eq(0);
      expect(await contract.totalAmountBought()).to.eq(0);
    });

    it("emits a buy event everytime a buy is created", async () => {
      const amount = parseUnits("10");
      await build.connect(buyer).approve(contract.address, amount);

      const tx = await contract.connect(buyer).buy(amount);

      const event = await findEvent(tx, "Buy");

      expect(event).to.exist;
      expect(event?.args?.wallet).to.eq(buyer.address);
      expect(event?.args?.amount).to.eq(amount);
      expect(event?.args?.walletTotalAmountBought).to.eq(amount);

      expect(await build.balanceOf(safe.address)).to.eq(amount);

      expect(await contract.totalBuys()).to.eq(1);
      expect(await contract.totalAmountBought()).to.eq(amount);
    });
  });

  describe("testing contract enable and disable", () => {
    beforeEach(async () => {
      contract = (await builder()) as BuyPoints;
    });

    it("allows the contract owner to disable and enable the contract", async () => {
      expect(await contract.enabled()).to.be.equal(true);

      await contract.connect(admin).disable();

      expect(await contract.enabled()).to.be.equal(false);

      await contract.connect(admin).enable();

      expect(await contract.enabled()).to.be.equal(true);
    });

    it("prevents other accounts to disable the contract", async () => {
      expect(await contract.enabled()).to.be.equal(true);

      const action = contract.connect(buyer).disable();

      await expect(action).to.be.reverted;

      expect(await contract.enabled()).to.be.equal(true);
    });

    it("prevents other accounts to enable the contract", async () => {
      const action = contract.connect(buyer).enable();

      await expect(action).to.be.reverted;
    });

    it("prevents disable when the contract is already disabled", async () => {
      expect(await contract.enabled()).to.be.equal(true);

      await contract.connect(admin).disable();

      const action = contract.connect(admin).disable();

      await expect(action).to.be.reverted;
    });

    it("prevents new buys when the contract is disabled", async () => {
      expect(await contract.enabled()).to.be.equal(true);

      await contract.connect(admin).disable();

      expect(await contract.enabled()).to.be.equal(false);

      const amount = parseUnits("10");
      await build.connect(buyer).approve(contract.address, amount);

      const action = contract.connect(buyer).buy(amount);

      await expect(action).to.be.revertedWith("The contract is disabled.");
    });

    it("allows the owner to withdraw", async () => {
      const amount = parseUnits("100");

      const initialBalance = await build.balanceOf(buyer.address);

      await build.connect(buyer).approve(contract.address, amount);

      await build.connect(buyer).transfer(contract.address, amount);

      await contract.connect(admin).adminWithdraw(amount, build.address, buyer.address);

      expect(await build.balanceOf(buyer.address)).to.eq(initialBalance);
    });
  });
});
