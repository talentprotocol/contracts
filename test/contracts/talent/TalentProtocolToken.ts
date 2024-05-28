import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { TalentProtocolToken } from "../../../typechain-types";
import { Artifacts } from "../../shared";

import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentProtocolToken", () => {
  let admin: SignerWithAddress;
  let holderOne: SignerWithAddress;
  let holderTwo: SignerWithAddress;
  let holderThree: SignerWithAddress;

  let token: TalentProtocolToken;

  beforeEach(async () => {
    [admin, holderOne, holderTwo, holderThree] = await ethers.getSigners();
  });

  async function builder() {
    return deployContract(admin, Artifacts.TalentProtocolToken, [admin.address]);
  }

  describe("Deploy base contract", () => {
    beforeEach(async () => {
      token = (await builder()) as TalentProtocolToken;
    });

    it("deploys and set ups the initial state correctly", async () => {
      expect(await token.name()).to.eq("TalentProtocolToken");
      expect(await token.symbol()).to.eq("TALENT");
      expect(await token.decimals()).to.eq(18);
      expect(await token.totalSupply()).to.eq(ethers.utils.parseEther("1000000000"));
      expect(await token.balanceOf(admin.address)).to.eq(ethers.utils.parseEther("1000000000"));
      expect(await token.paused()).to.eq(true);
    });
  });

  describe("Transfer behaviour", () => {
    beforeEach(async () => {
      token = (await builder()) as TalentProtocolToken;
    });

    it("Should not allow transfers when paused", async function () {
      await expect(token.connect(holderOne).transfer(holderOne.address, 50)).to.be.revertedWith(
        "Token transfer is not enabled while paused"
      );
    });

    it("Should allow the admin to transfer when paused", async function () {
      await token.connect(admin).transfer(holderOne.address, 50);
      const holderOneBalance = await token.balanceOf(holderOne.address);
      expect(holderOneBalance).to.equal(50);
    });

    it("Should transfer tokens between accounts when unpaused", async function () {
      await token.unpause();

      // Transfer 50 tokens from admin to holderOne
      await token.transfer(holderOne.address, 50);
      const holderOneBalance = await token.balanceOf(holderOne.address);
      expect(holderOneBalance).to.equal(50);

      // Transfer 50 tokens from holderOne to addr2
      await token.connect(holderOne).transfer(holderTwo.address, 50);
      const addr2Balance = await token.balanceOf(holderTwo.address);
      expect(addr2Balance).to.equal(50);
    });
  });

  describe("TransferFrom behaviour", () => {
    beforeEach(async () => {
      token = (await builder()) as TalentProtocolToken;
    });

    it("Should not allow transfersFrom when paused", async function () {
      await token.approve(holderOne.address, 50);
      await expect(token.connect(holderOne).transferFrom(admin.address, holderOne.address, 50)).to.be.revertedWith(
        "Token transfer is not enabled while paused"
      );
    });

    it("Should allow transferFrom when unpaused", async function () {
      await token.unpause();
      await token.approve(holderOne.address, 50);
      await token.connect(holderOne).transferFrom(admin.address, holderOne.address, 50);
      const holderOneBalance = await token.balanceOf(holderOne.address);
      expect(holderOneBalance).to.equal(50);
    });

    it("Should not allow transferFrom more than the approved amount", async function () {
      await token.unpause();
      await token.approve(holderOne.address, 50);
      await expect(token.connect(holderOne).transferFrom(admin.address, holderOne.address, 100)).to.be.revertedWith(
        `ERC20InsufficientAllowance("${holderOne.address}", 50, 100)`
      );
    });

    it("Should allow transferFrom between accounts", async function () {
      await token.unpause();
      await token.transfer(holderOne.address, 100); // Transfer some tokens to holderOne
      await token.connect(holderOne).approve(holderTwo.address, 50);
      await token.connect(holderTwo).transferFrom(holderOne.address, holderThree.address, 50);
      const holderThreeBalance = await token.balanceOf(holderThree.address);
      expect(holderThreeBalance).to.equal(50);
      const holderOneBalance = await token.balanceOf(holderOne.address);
      expect(holderOneBalance).to.equal(50); // 100 - 50 transferred to holderThree
    });

    it("Should allow the owner to transferFrom when paused", async function () {
      await token.approve(admin.address, 50);
      await token.connect(admin).transferFrom(admin.address, holderOne.address, 50);
      const holderOneBalance = await token.balanceOf(holderOne.address);
      expect(holderOneBalance).to.equal(50);
    });
  });

  describe("Pausing", function () {
    beforeEach(async () => {
      token = (await builder()) as TalentProtocolToken;
    });

    it("Should allow the owner to pause and unpause the contract", async function () {
      await token.unpause();
      expect(await token.paused()).to.equal(false);

      await token.pause();
      expect(await token.paused()).to.equal(true);
    });

    it("Should not allow non-owner to pause or unpause the contract", async function () {
      await expect(token.connect(holderOne).pause()).to.be.revertedWith(
        `OwnableUnauthorizedAccount("${holderOne.address}")`
      );
      await expect(token.connect(holderOne).unpause()).to.be.revertedWith(
        `OwnableUnauthorizedAccount("${holderOne.address}")`
      );
    });
  });

  describe("Burning", function () {
    beforeEach(async () => {
      token = (await builder()) as TalentProtocolToken;
      await token.unpause();
    });

    it("Should burn tokens correctly", async function () {
      await token.transfer(holderOne.address, 100);

      await token.connect(holderOne).burn(50);
      const addr1Balance = await token.balanceOf(holderOne.address);
      expect(addr1Balance).to.equal(50);

      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther("1000000000").sub(50));
    });
  });
});
