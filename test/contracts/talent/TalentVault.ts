import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TalentProtocolToken, TalentVault, PassportRegistry, PassportBuilderScore } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { TalentVault as TalentVaultArtifact } from "../../shared/artifacts";

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
      ethers.utils.parseEther("10000"),
      passportBuilderScore.address,
      ethers.utils.parseEther("10000"),
    ])) as TalentVault;

    // Approve TalentVault contract to spend tokens on behalf of the admin
    const totalAllowance = ethers.utils.parseUnits("600000000", 18);
    await talentToken.approve(talentVault.address, totalAllowance);
    await talentToken.unpause();
    // await talentToken.renounceOwnership();
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await talentVault.owner()).not.to.equal(ethers.constants.AddressZero);
      expect(await talentVault.owner()).to.equal(admin.address);
    });

    it("Should set some initial balance for the owner", async () => {
      const ownerBalance = await talentVault.balanceOf(admin.address);
      expect(ownerBalance).to.equal(ethers.utils.parseEther("10000"));
    });

    it("Should set the correct initial values", async () => {
      expect(await talentVault.yieldRateBase()).to.equal(10_00);
      expect(await talentVault.yieldRateProficient()).to.equal(15_00);
      expect(await talentVault.yieldRateCompetent()).to.equal(20_00);
      expect(await talentVault.yieldRateExpert()).to.equal(25_00);

      expect(await talentVault.maxYieldAmount()).to.equal(ethers.utils.parseEther("10000"));

      expect(await talentVault.passportBuilderScore()).not.to.equal(ethers.constants.AddressZero);
      expect(await talentVault.passportBuilderScore()).to.equal(passportBuilderScore.address);
    });

    it("reverts with InvalidAddress when _token given is 0", async () => {
      await expect(
        deployContract(admin, Artifacts.TalentVault, [
          ethers.constants.AddressZero,
          admin.address,
          ethers.utils.parseEther("500000"),
          passportBuilderScore.address,
        ])
      ).to.be.reverted;
    });

    it("reverts with InvalidAddress when _yieldSource given is 0", async () => {
      await expect(
        deployContract(admin, Artifacts.TalentVault, [
          talentToken.address,
          ethers.constants.AddressZero,
          ethers.utils.parseEther("500000"),
          passportBuilderScore.address,
        ])
      ).to.be.reverted;
    });

    it("reverts with InvalidAddress when _passportBuilderScore given is 0", async () => {
      await expect(
        deployContract(admin, Artifacts.TalentVault, [
          talentToken.address,
          admin.address,
          ethers.utils.parseEther("500000"),
          ethers.constants.AddressZero,
        ])
      ).to.be.reverted;
    });
  });

  describe("Deposits", () => {
    it("Should allow users to deposit tokens", async () => {
      const depositAmount = 10_000n;

      await talentToken.transfer(user1.address, depositAmount); // so that it has enough balance
      const user1BalanceBefore = await talentToken.balanceOf(user1.address);

      await talentToken.connect(user1).approve(talentVault.address, depositAmount);

      const vaultBalanceBefore = await talentToken.balanceOf(talentVault.address);

      const user1BalanceInTalentVaultBefore = await talentVault.balanceOf(user1.address);

      // fire
      await expect(talentVault.connect(user1).deposit(depositAmount))
        .to.emit(talentVault, "Deposited")
        .withArgs(user1.address, depositAmount);

      // vault balance in TALENT is increased
      const vaultBalanceAfter = await talentToken.balanceOf(talentVault.address);
      const expectedVaultBalanceAfter = vaultBalanceBefore.toBigInt() + depositAmount;
      expect(vaultBalanceAfter).to.equal(expectedVaultBalanceAfter);

      // user1 balance in TALENT decreases
      const user1BalanceAfter = await talentToken.balanceOf(user1.address);
      expect(user1BalanceAfter).to.equal(user1BalanceBefore.toBigInt() - depositAmount);

      // user1 balance in TalentVault increases
      const user1BalanceInTalentVaultAfter = await talentVault.balanceOf(user1.address);
      expect(user1BalanceInTalentVaultAfter).to.equal(user1BalanceInTalentVaultBefore.toBigInt() + depositAmount);
    });

    describe("#depositForAddress", async () => {
      it("Should deposit the amount to the address given", async () => {
        const depositAmount = 100_000n;
        await talentToken.transfer(user1.address, depositAmount); // so that sender has enough balance
        const user1BalanceBefore = await talentToken.balanceOf(user1.address);

        await talentToken.connect(user1).approve(talentVault.address, depositAmount); // so that sender has approved vault

        const vaultBalanceBefore = await talentToken.balanceOf(talentVault.address);

        const user2DepositBefore = await talentVault.getDeposit(user2.address);

        // fire
        await expect(talentVault.connect(user1).depositForAddress(user2.address, depositAmount))
          .to.emit(talentVault, "Deposited")
          .withArgs(user2.address, depositAmount);

        // user1 talent balance is decreased
        const user1BalanceAfter = await talentVault.balanceOf(user1.address);
        const expectedUser1BalanceAfter = user1BalanceBefore.sub(depositAmount);
        expect(user1BalanceAfter).to.equal(expectedUser1BalanceAfter);

        // vault balance is increased
        const vaultBalanceAfter = await talentToken.balanceOf(talentVault.address);
        const expectedVaultBalanceAfter = vaultBalanceBefore.toBigInt() + depositAmount;
        expect(vaultBalanceAfter).to.equal(expectedVaultBalanceAfter);

        // deposit for user2 is updated on storage
        const user2DepositAfter = await talentVault.getDeposit(user2.address);
        expect(user2DepositAfter.user).to.equal(user2.address);
        expect(user2DepositAfter.depositedAmount).to.equal(
          user2DepositBefore.depositedAmount.toBigInt() + depositAmount
        );
        expect(user2DepositAfter.amount).to.equal(user2DepositBefore.amount.toBigInt() + depositAmount);
      });

      it("Should not allow deposits of zero tokens", async () => {
        await expect(talentVault.connect(user1).depositForAddress(ethers.constants.AddressZero, 0n)).to.be.revertedWith(
          "InvalidDepositAmount()"
        );
      });

      it("Should not allow deposit of amount that the sender does not have", async () => {
        const balanceOfUser1 = 100_000n;

        await talentToken.transfer(user1.address, balanceOfUser1);

        const depositAmount = 100_001n;

        await expect(talentVault.connect(user1).depositForAddress(user2.address, depositAmount)).to.be.revertedWith(
          "InsufficientBalance()"
        );
      });

      it("Should not allow deposit of amount bigger than the allowed by the sender to be spent by the talent contract", async () => {
        const depositAmount = 100_000n;

        await talentToken.transfer(user1.address, depositAmount); // so that user1 has enough balance

        const approvedAmount = depositAmount - 1n;

        await talentToken.connect(user1).approve(talentVault.address, approvedAmount);

        // fire

        await expect(talentVault.connect(user1).depositForAddress(user2.address, depositAmount)).to.be.revertedWith(
          "InsufficientAllowance()"
        );
      });

      it("Should allow deposit of amount equal to the allowed by the sender to be spent by the talent contract", async () => {
        const depositAmount = ethers.utils.parseEther("1000");

        await talentToken.connect(user1).approve(talentVault.address, depositAmount);

        await expect(talentVault.connect(user1).depositForAddress(user2.address, depositAmount)).to.be.revertedWith(
          "InsufficientBalance()"
        );
      });
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

    // 10000
    it("Should calculate interest even if amount is above the max yield amount correctly", async () => {
      const depositAmount = ethers.utils.parseEther("15000");
      const maxAmount = ethers.utils.parseEther("10000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount);

      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
      await ethers.provider.send("evm_mine", []);

      const expectedInterest = maxAmount.mul(10).div(100); // 10% interest
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
