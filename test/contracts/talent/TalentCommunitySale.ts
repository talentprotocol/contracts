import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { TalentCommunitySale, USDTMock } from "../../../typechain-types";
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
  let receiver: SignerWithAddress;

  let communitySaleContract: TalentCommunitySale;
  let paymentToken: USDTMock;

  beforeEach(async () => {
    [admin, holderOne, holderTwo, holderThree, receiver] = await ethers.getSigners();
  });

  async function builder(token: string) {
    return deployContract(admin, Artifacts.TalentCommunitySale, [admin.address, token, receiver.address, 6]);
  }

  describe("Deploy base contract", () => {
    beforeEach(async () => {
      paymentToken = (await deployContract(admin, Artifacts.USDTMock, [])) as USDTMock;
      communitySaleContract = (await builder(paymentToken.address)) as TalentCommunitySale;
    });

    it("Should set the correct admin", async () => {
      expect(await communitySaleContract.owner()).to.equal(admin.address);
    });

    it("Should set the correct payment token", async () => {
      expect(await communitySaleContract.paymentToken()).to.equal(paymentToken.address);
    });

    it("Should set the correct payment token", async () => {
      expect(await communitySaleContract.paymentToken()).to.equal(paymentToken.address);
    });
  });

  describe("Sale functions", () => {
    beforeEach(async () => {
      paymentToken = (await deployContract(admin, Artifacts.USDTMock, [])) as USDTMock;
      communitySaleContract = (await builder(paymentToken.address)) as TalentCommunitySale;

      await paymentToken.connect(admin).transfer(holderOne.address, ethers.utils.parseUnits("2000", 6));
      await paymentToken.connect(admin).transfer(holderTwo.address, ethers.utils.parseUnits("2000", 6));
      await paymentToken.connect(admin).transfer(holderThree.address, ethers.utils.parseUnits("2000", 6));
    });

    it("Should allow a user to buy tier 1", async () => {
      await paymentToken.connect(holderOne).approve(communitySaleContract.address, ethers.utils.parseUnits("2000", 6));
      await communitySaleContract.connect(holderOne).buyTier1();
      expect(await paymentToken.balanceOf(receiver.address)).to.equal(ethers.utils.parseUnits("100", 6));
      expect(await communitySaleContract.tier1Bought()).to.equal(1);
      expect(await communitySaleContract.listOfBuyers(holderOne.address)).to.be.true;
    });

    it("Should not allow a user to buy more than one tier", async () => {
      await paymentToken.connect(holderOne).approve(communitySaleContract.address, ethers.utils.parseUnits("2000", 6));
      await communitySaleContract.connect(holderOne).buyTier1();
      await expect(communitySaleContract.connect(holderOne).buyTier2()).to.be.revertedWith(
        "TalentCommunitySale: Address already bought"
      );
    });

    it("Should allow a user to buy tier 2", async () => {
      await paymentToken.connect(holderTwo).approve(communitySaleContract.address, ethers.utils.parseUnits("2000", 6));
      await communitySaleContract.connect(holderTwo).buyTier2();
      expect(await paymentToken.balanceOf(receiver.address)).to.equal(ethers.utils.parseUnits("250", 6));
      expect(await communitySaleContract.tier2Bought()).to.equal(1);
      expect(await communitySaleContract.listOfBuyers(holderTwo.address)).to.be.true;
    });

    it("Should allow a user to buy tier 3", async () => {
      await paymentToken
        .connect(holderThree)
        .approve(communitySaleContract.address, ethers.utils.parseUnits("2000", 6));
      await communitySaleContract.connect(holderThree).buyTier3();
      expect(await paymentToken.balanceOf(receiver.address)).to.equal(ethers.utils.parseUnits("500", 6));
      expect(await communitySaleContract.tier3Bought()).to.equal(1);
      expect(await communitySaleContract.listOfBuyers(holderThree.address)).to.be.true;
    });

    it("Should not allow a user to buy if tier 1 is sold out", async () => {
      for (let i = 0; i < 300; i++) {
        const newSigner = await ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({
          to: newSigner.address,
          value: ethers.utils.parseUnits("1"),
        });
        await paymentToken.connect(admin).transfer(newSigner.address, ethers.utils.parseUnits("2000", 6));
        await paymentToken.connect(newSigner).approve(communitySaleContract.address, ethers.utils.parseUnits("100", 6));
        await communitySaleContract.connect(newSigner).buyTier1();
      }
      await paymentToken.connect(holderOne).approve(communitySaleContract.address, ethers.utils.parseUnits("2000", 6));
      await expect(communitySaleContract.connect(holderOne).buyTier1()).to.be.revertedWith(
        "TalentCommunitySale: Tier 1 sold out"
      );
    });

    it("Should not allow a user to buy with insufficient allowance", async () => {
      await paymentToken.connect(holderOne).approve(communitySaleContract.address, ethers.utils.parseUnits("50", 6));
      await expect(communitySaleContract.connect(holderOne).buyTier1()).to.be.revertedWith(
        "TalentCommunitySale: Insufficient allowance"
      );
    });
  });
});
