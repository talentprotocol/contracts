import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { PassportRegistry } from "../../../typechain-types";
import { Artifacts } from "../../shared";

import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("Passport", () => {
  let admin: SignerWithAddress;
  let holderOne: SignerWithAddress;
  let holderTwo: SignerWithAddress;
  let holderThree: SignerWithAddress;

  let contract: PassportRegistry;

  beforeEach(async () => {
    [admin, holderOne, holderTwo, holderThree] = await ethers.getSigners();
  });

  async function builder() {
    return deployContract(admin, Artifacts.PassportRegistry, [admin.address]);
  }

  describe("behaviour", () => {
    beforeEach(async () => {
      contract = (await builder()) as PassportRegistry;
    });

    it("is created with the correct state", async () => {
      expect(await contract.totalCreates()).to.eq(0);
      expect(await contract.totalPublicCreates()).to.eq(0);
      expect(await contract.paused()).to.eq(false);
      expect(await contract.initialPassportId()).to.eq(1000);
    });

    it("emits a create event everytime a passport is created", async () => {
      let tx = await contract.connect(holderOne).create("farcaster");

      let event = await findEvent(tx, "Create");

      expect(event).to.exist;
      expect(event?.args?.wallet).to.eq(holderOne.address);
      expect(event?.args?.passportId).to.eq(1001);

      tx = await contract.connect(holderTwo).create("farcaster");

      event = await findEvent(tx, "Create");

      expect(event).to.exist;
      expect(event?.args?.wallet).to.eq(holderTwo.address);
      expect(event?.args?.passportId).to.eq(1002);
      expect(event?.args?.source).to.eq("farcaster");
    });

    it("stores the contract state correctly", async () => {
      await contract.connect(holderOne).create("farcaster");

      await contract.connect(holderTwo).create("passport");

      await contract.connect(holderThree).create("passport");

      await contract.connect(admin).adminTransfer(holderThree.address, 5);

      const publicCreates = await contract.totalPublicCreates();
      const totalPassportTransfers = await contract.totalPassportTransfers();

      const holderOnePassportId = await contract.passportId(holderOne.address);
      const holderTwoPassportId = await contract.passportId(holderTwo.address);
      const holderThreePassportId = await contract.passportId(holderThree.address);
      const holderThreeActivePassport = await contract.walletActive(holderThree.address);
      const holderThreeActivePassportId = await contract.idActive(5);
      const holderThreePreviousPassportId = await contract.idActive(1003);

      expect(publicCreates).to.eq(3);
      expect(totalPassportTransfers).to.eq(1);
      expect(holderOnePassportId).to.eq(1001);
      expect(holderTwoPassportId).to.eq(1002);
      expect(holderThreePassportId).to.eq(5);
      expect(holderThreeActivePassport).to.eq(true);
      expect(holderThreeActivePassportId).to.eq(true);
      expect(holderThreePreviousPassportId).to.eq(false);
    });

    it("emits a tranfer event everytime a passport is tranfered", async () => {
      let tx = await contract.connect(holderOne).create("farcaster");

      tx = await contract.connect(holderOne).transfer(holderTwo.address);

      const event = await findEvent(tx, "Transfer");

      expect(event).to.exist;
      expect(event?.args?.oldPassportId).to.eq(1001);
      expect(event?.args?.newPassportId).to.eq(1001);
      expect(event?.args?.oldWallet).to.eq(holderOne.address);
      expect(event?.args?.newWallet).to.eq(holderTwo.address);

      const holderOnePassportId = await contract.passportId(holderOne.address);
      const holderTwoPassportId = await contract.passportId(holderTwo.address);

      expect(holderOnePassportId).to.eq(0);
      expect(holderTwoPassportId).to.eq(1001);
    });

    it("emits a tranfer event everytime a passport is tranfered by an admin", async () => {
      let tx = await contract.connect(holderOne).create("farcaster");

      let holderOnePassportId = await contract.passportId(holderOne.address);
      expect(holderOnePassportId).to.eq(1001);

      tx = await contract.connect(admin).adminTransfer(holderOne.address, 1);

      const event = await findEvent(tx, "Transfer");

      expect(event).to.exist;
      expect(event?.args?.oldPassportId).to.eq(1001);
      expect(event?.args?.newPassportId).to.eq(1);
      expect(event?.args?.oldWallet).to.eq(holderOne.address);
      expect(event?.args?.newWallet).to.eq(holderOne.address);

      holderOnePassportId = await contract.passportId(holderOne.address);

      expect(holderOnePassportId).to.eq(1);
    });

    it("prevents duplicated passports", async () => {
      await contract.connect(holderOne).create("farcaster");
      const action = contract.connect(holderOne).create("farcaster");

      await expect(action).to.be.reverted;
    });

    it("prevents admin transfers of existing passports", async () => {
      await contract.connect(holderOne).create("farcaster");

      const action = contract.connect(admin).adminTransfer(holderOne.address, 1001);

      await expect(action).to.be.revertedWith("New passport id already has a owner");
    });

    it("prevents admin transfers of wallets without passport", async () => {
      const action = contract.connect(admin).adminTransfer(holderTwo.address, 2);

      await expect(action).to.be.revertedWith("Wallet does not have a passport to transfer from");
    });
  });

  describe("testing passport activate and deactivate", () => {
    beforeEach(async () => {
      contract = (await builder()) as PassportRegistry;
    });

    it("emits events", async () => {
      await contract.connect(holderOne).create("farcaster");

      let holderActivePassport = await contract.walletActive(holderOne.address);
      expect(holderActivePassport).to.eq(true);

      let tx = await contract.connect(admin).deactivate(holderOne.address);
      let event = await findEvent(tx, "Deactivate");

      expect(event).to.exist;
      expect(event?.args?.wallet).to.eq(holderOne.address);
      expect(event?.args?.passportId).to.eq(1001);

      holderActivePassport = await contract.walletActive(holderOne.address);
      expect(holderActivePassport).to.eq(false);

      tx = await contract.connect(admin).activate(holderOne.address);

      event = await findEvent(tx, "Activate");

      expect(event).to.exist;
      expect(event?.args?.wallet).to.eq(holderOne.address);
      expect(event?.args?.passportId).to.eq(1001);

      holderActivePassport = await contract.walletActive(holderOne.address);
      expect(holderActivePassport).to.eq(true);
    });
  });

  describe("testing contract enable and disable", () => {
    beforeEach(async () => {
      contract = (await builder()) as PassportRegistry;
    });

    it("allows the contract owner to disable and enable the contract", async () => {
      expect(await contract.paused()).to.be.equal(false);

      await contract.connect(admin).pause();

      expect(await contract.paused()).to.be.equal(true);

      await contract.connect(admin).unpause();

      expect(await contract.paused()).to.be.equal(false);
    });

    it("prevents other accounts to disable the contract", async () => {
      expect(await contract.paused()).to.be.equal(false);

      const action = contract.connect(holderOne).pause();

      await expect(action).to.be.reverted;

      expect(await contract.paused()).to.be.equal(false);
    });

    it("prevents other accounts to enable the contract", async () => {
      const action = contract.connect(holderOne).unpause();

      await expect(action).to.be.reverted;
    });

    it("prevents disable when the contract is already disabled", async () => {
      expect(await contract.paused()).to.be.equal(false);

      await contract.connect(admin).pause();

      const action = contract.connect(admin).pause();

      await expect(action).to.be.reverted;
    });

    it("prevents new creates when the contract is disabled", async () => {
      expect(await contract.paused()).to.be.equal(false);

      await contract.connect(admin).pause();

      expect(await contract.paused()).to.be.equal(true);

      const action = contract.connect(holderOne).create("farcaster");

      await expect(action).to.be.revertedWith("Pausable: paused");
    });
  });
});
