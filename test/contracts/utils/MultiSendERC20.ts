import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { MultiSendERC20, ERC20Mock } from "../../../typechain-types";
import { Artifacts } from "../../shared";

import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentProtocolToken", () => {
  let admin: SignerWithAddress;
  let recipientOne: SignerWithAddress;
  let recipientTwo: SignerWithAddress;
  let recipientThree: SignerWithAddress;

  let token: ERC20Mock;
  let multiSend: MultiSendERC20;

  beforeEach(async () => {
    [admin, recipientOne, recipientTwo, recipientThree] = await ethers.getSigners();
    token = (await deployContract(admin, Artifacts.ERC20Mock, [admin.address])) as ERC20Mock;
  });

  async function builder() {
    return deployContract(admin, Artifacts.MultiSendERC20, [admin.address, token.address]);
  }

  describe("Deploy base contract", () => {
    beforeEach(async () => {
      multiSend = (await builder()) as MultiSendERC20;
    });

    it("deploys and set ups the initial state correctly", async () => {
      expect(await multiSend.token()).to.eq(token.address);
      expect(await multiSend.owner()).to.eq(admin.address);
      expect(await multiSend.arrayLimit()).to.eq(200);
    });
  });

  describe("Transfer behaviour", () => {
    beforeEach(async () => {
      multiSend = (await builder()) as MultiSendERC20;
      await token.approve(multiSend.address, ethers.utils.parseEther("1000000000"));
    });

    it("Should transfer tokens between one account", async function () {
      await multiSend.connect(admin).multisendToken([recipientOne.address], [50]);
      const recipientOneBalance = await token.balanceOf(recipientOne.address);
      expect(recipientOneBalance).to.equal(50);
    });

    it("Should transfer tokens between multiple accounts", async function () {
      await multiSend.connect(admin).multisendToken([recipientOne.address, recipientTwo.address], [50, 100]);
      const recipientOneBalance = await token.balanceOf(recipientOne.address);
      const recipientTwoBalance = await token.balanceOf(recipientTwo.address);
      expect(recipientOneBalance).to.equal(50);
      expect(recipientTwoBalance).to.equal(100);
    });
  });
});
