import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TalentProtocolToken, TalentVault, PassportRegistry, PassportBuilderScore } from "../../../typechain-types";
import { Artifacts } from "../../shared";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentVault", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let talentToken: TalentProtocolToken;
  let passportRegistry: PassportRegistry;
  let passportBuilderScore: PassportBuilderScore;
  let talentVault: TalentVault;

  beforeEach(async () => {
    [admin, user1, user2, user3] = await ethers.getSigners();

    talentToken = (await deployContract(admin, Artifacts.TalentProtocolToken, [admin.address])) as TalentProtocolToken;
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportBuilderScore = (await deployContract(admin, Artifacts.PassportBuilderScore, [
      passportRegistry.address,
      admin.address,
    ])) as PassportBuilderScore;
    talentVault = (await deployContract(admin, Artifacts.TalentVault, [
      talentToken.address,
      admin.address,
      ethers.utils.parseEther("500000"),
      passportBuilderScore.address,
    ])) as TalentVault;

    // Approve TalentVault contract to spend tokens on behalf of the admin
    const totalAllowance = ethers.utils.parseUnits("600000000", 18);
    await talentToken.approve(talentVault.address, totalAllowance);
    await talentToken.unpause();
    await talentToken.renounceOwnership();
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await talentVault.owner()).to.equal(admin.address);
    });

    it("Should set the correct initial values", async () => {
      expect(await talentVault.yieldRateBase()).to.equal(10_00);
      expect(await talentVault.yieldRateProficient()).to.equal(15_00);
      expect(await talentVault.yieldRateCompetent()).to.equal(20_00);
      expect(await talentVault.yieldRateExpert()).to.equal(25_00);
      expect(await talentVault.maxYieldAmount()).to.equal(ethers.utils.parseEther("500000"));
    });
  });

  describe("Deposits", () => {
    it("Should allow users to deposit tokens", async () => {
      const depositAmount = ethers.utils.parseEther("1000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);

      await expect(talentVault.connect(user1).deposit(depositAmount))
        .to.emit(talentVault, "Deposited")
        .withArgs(user1.address, depositAmount);

      const userBalance = await talentVault.balanceOf(user1.address);
      expect(userBalance).to.equal(depositAmount);
    });

    it("Should not allow deposits of zero tokens", async () => {
      await expect(talentVault.connect(user1).deposit(0)).to.be.revertedWith("Invalid deposit amount");
    });
  });

  describe("Withdrawals", () => {
    beforeEach(async () => {
      const depositAmount = ethers.utils.parseEther("1000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount);
    });

    it("Should allow users to withdraw tokens", async () => {
      const withdrawAmount = ethers.utils.parseEther("500");
      await expect(talentVault.connect(user1).withdraw(withdrawAmount))
        .to.emit(talentVault, "Withdrawn")
        .withArgs(user1.address, withdrawAmount);

      const userBalance = await talentVault.balanceOf(user1.address);
      expect(userBalance).to.be.closeTo(ethers.utils.parseEther("500"), ethers.utils.parseEther("0.1"));
    });

    it("Should not allow withdrawals of more than the balance", async () => {
      const withdrawAmount = ethers.utils.parseEther("1500");
      await expect(talentVault.connect(user1).withdraw(withdrawAmount)).to.be.revertedWith("Not enough balance");
    });
  });

  describe("Interest Calculation", () => {
    it("Should calculate interest correctly", async () => {
      const depositAmount = ethers.utils.parseEther("1000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount);

      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
      await ethers.provider.send("evm_mine", []);

      const expectedInterest = depositAmount.mul(10).div(100); // 10% interest
      const userBalance = await talentVault.balanceOf(user1.address);
      expect(userBalance).to.equal(depositAmount.add(expectedInterest));
    });

    it("Should calculate interest correctly for builders with scores below 50", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 40); // Set builder score below 50
      const depositAmount = ethers.utils.parseEther("1000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount);

      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
      await ethers.provider.send("evm_mine", []);

      await passportBuilderScore.setScore(passportId, 40); // Set builder score below 50

      const expectedInterest = depositAmount.mul(15).div(100); // 15% interest
      const userBalance = await talentVault.balanceOf(user1.address);
      expect(userBalance).to.be.closeTo(depositAmount.add(expectedInterest), ethers.utils.parseEther("0.1"));
    });

    it("Should calculate interest correctly for builders with scores above 50", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 65); // Set builder score above 50
      const depositAmount = ethers.utils.parseEther("1000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount);

      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
      await ethers.provider.send("evm_mine", []);

      await passportBuilderScore.setScore(passportId, 65); // Set builder score above 50

      const expectedInterest = depositAmount.mul(20).div(100); // 20% interest
      const userBalance = await talentVault.balanceOf(user1.address);
      expect(userBalance).to.be.closeTo(depositAmount.add(expectedInterest), ethers.utils.parseEther("0.1"));
    });

    it("Should calculate interest correctly for builders with scores above 75", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 90); // Set builder score above 75
      const depositAmount = ethers.utils.parseEther("1000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount);

      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
      await ethers.provider.send("evm_mine", []);

      await passportBuilderScore.setScore(passportId, 90); // Set builder score above 75

      const expectedInterest = depositAmount.mul(25).div(100); // 25% interest
      const userBalance = await talentVault.balanceOf(user1.address);
      expect(userBalance).to.be.closeTo(depositAmount.add(expectedInterest), ethers.utils.parseEther("0.1"));
    });
  });

  describe("Administrative Functions", () => {
    it("Should allow the owner to update the yield rate", async () => {
      const newYieldRate = 15_00; // 15%
      await talentVault.connect(admin).setYieldRate(newYieldRate);
      expect(await talentVault.yieldRateBase()).to.equal(newYieldRate);
    });

    it("Should not allow non-owners to update the yield rate", async () => {
      const newYieldRate = 15_00; // 15%
      await expect(talentVault.connect(user1).setYieldRate(newYieldRate)).to.be.revertedWith(
        `OwnableUnauthorizedAccount("${user1.address}")`
      );
    });
  });
});
