import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  TalentProtocolToken,
  TalentVault,
  PassportRegistry,
  PassportBuilderScore,
  PassportWalletRegistry,
} from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { ensureTimestamp } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

async function ensureTimeIsAfterLockPeriod() {
  const lockPeriod = 31;
  const oneDayAfterLockPeriod = Math.floor(Date.now() / 1000) + lockPeriod * 24 * 60 * 60;
  await ensureTimestamp(oneDayAfterLockPeriod);
}

describe("TalentVault", () => {
  let admin: SignerWithAddress;
  let yieldSource: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let talentToken: TalentProtocolToken;
  let passportRegistry: PassportRegistry;
  let passportWalletRegistry: PassportWalletRegistry;
  let passportBuilderScore: PassportBuilderScore;
  let talentVault: TalentVault;

  let snapshotId: bigint;
  let currentDateEpochSeconds: number;
  const yieldBasePerDay = ethers.utils.parseEther("0.137");

  before(async () => {
    await ethers.provider.send("hardhat_reset", []);

    [admin, yieldSource, user1, user2, user3] = await ethers.getSigners();

    talentToken = (await deployContract(admin, Artifacts.TalentProtocolToken, [admin.address])) as TalentProtocolToken;
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportWalletRegistry = (await deployContract(admin, Artifacts.PassportWalletRegistry, [
      admin.address,
      passportRegistry.address,
    ])) as PassportWalletRegistry;
    passportBuilderScore = (await deployContract(admin, Artifacts.PassportBuilderScore, [
      passportRegistry.address,
      admin.address,
    ])) as PassportBuilderScore;

    // const adminInitialDeposit = ethers.utils.parseEther("200000");
    talentVault = (await deployContract(admin, Artifacts.TalentVault, [
      talentToken.address,
      yieldSource.address,
      passportBuilderScore.address,
      passportWalletRegistry.address,
    ])) as TalentVault;

    console.log("------------------------------------");
    console.log("Addresses:");
    console.log(`admin = ${admin.address}`);
    console.log(`user1 = ${user1.address}`);
    console.log(`user2 = ${user2.address}`);
    console.log(`user3 = ${user3.address}`);
    console.log(`talentToken = ${talentToken.address}`);
    console.log(`talentVault = ${talentVault.address}`);
    console.log(`yieldSource = ${yieldSource.address}`);
    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

    // Approve TalentVault contract to spend tokens on behalf of the admin
    const totalAllowance = ethers.utils.parseUnits("600000000", 18);
    await talentToken.approve(talentVault.address, totalAllowance);
    await talentToken.unpause();

    // just make sure that TV wallet has $TALENT as initial assets from admin initial deposit
    await talentToken.approve(talentVault.address, ethers.constants.MaxUint256);
    // await talentVault.mint(adminInitialDeposit, admin.address);

    // fund the yieldSource with lots of TALENT Balance
    await talentToken.transfer(yieldSource.address, ethers.utils.parseEther("100000"));
    await talentToken.connect(yieldSource).approve(talentVault.address, ethers.utils.parseEther("100000"));
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
    currentDateEpochSeconds = Math.floor(Date.now() / 1000);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("Deployment", async () => {
    it("Should set the right owner", async () => {
      expect(await talentVault.owner()).not.to.equal(ethers.constants.AddressZero);
      expect(await talentVault.owner()).to.equal(admin.address);
    });

    it("Should set the correct initial values", async () => {
      expect(await talentVault.yieldRateBase()).to.equal(5_00);

      expect(await talentVault.passportBuilderScore()).not.to.equal(ethers.constants.AddressZero);
      expect(await talentVault.passportBuilderScore()).to.equal(passportBuilderScore.address);

      expect(await talentVault.yieldRewardsFlag()).to.equal(true);

      expect(await talentVault.lockPeriod()).to.equal(30 * 24 * 60 * 60);
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

  describe("#name", async () => {
    it("is 'TalentVault' reflects the underlying token name, i.e. of 'TalentProtocolToken'", async () => {
      const name = await talentVault.name();

      expect(name).to.equal("TalentVault");
    });
  });

  describe("#symbol", async () => {
    it("is 'sTALENT' reflects the underlying token symbol, i.e. of 'TALENT'", async () => {
      const symbol = await talentVault.symbol();

      expect(symbol).to.equal("sTALENT");
    });
  });

  describe("#asset", async () => {
    it("returns the address of the $TALENT contract", async () => {
      const returnedAddress = await talentVault.asset();

      expect(returnedAddress).not.to.equal(ethers.constants.AddressZero);
      expect(returnedAddress).to.equal(talentToken.address);
    });
  });

  describe("#totalAssets", async () => {
    it("returns the number of $TALENT that TalentVault Contract has as balance", async () => {
      await talentToken.approve(talentVault.address, 10n);
      await talentVault.deposit(10n, user1.address);

      const returnedValue = await talentVault.totalAssets();
      const balanceOfTalentVaultInTalent = await talentToken.balanceOf(talentVault.address);

      expect(returnedValue).to.equal(balanceOfTalentVaultInTalent);
    });
  });

  describe("Transferability", async () => {
    describe("#transfer", async () => {
      it("reverts because TalentVault is not transferable", async () => {
        await expect(talentVault.transfer(user1.address, 10n)).to.be.revertedWith("TalentVaultNonTransferable");
      });
    });

    describe("#transferFrom", async () => {
      it("reverts because TalentVault is not transferable", async () => {
        await talentVault.approve(admin.address, 10n);
        // fire
        await expect(talentVault.transferFrom(admin.address, user2.address, 10n)).to.be.revertedWith(
          "TalentVaultNonTransferable"
        );
      });
    });
  });

  describe("#maxDeposit", async () => {
    context("when recipient does not have a deposit limit", async () => {
      it("returns the maximum uint256", async () => {
        const maxDeposit = await talentVault.maxDeposit(user1.address);

        expect(maxDeposit).to.equal(ethers.constants.MaxUint256);
      });
    });
  });

  describe("#convertToShares", async () => {
    it("Should convert $TALENT to $TALENTVAULT with 1-to-1 ratio", async () => {
      const amountOfTalent = 10_000n;
      const amountOfTalentVault = await talentVault.convertToShares(amountOfTalent);
      expect(amountOfTalentVault).to.equal(amountOfTalent);
    });
  });

  describe("#convertToAssets", async () => {
    it("Should convert $TALENTVAULT to $TALENT with 1-to-1 ratio", async () => {
      const amountOfTalentVault = 10_000n;
      const amountOfTalent = await talentVault.convertToAssets(amountOfTalentVault);
      expect(amountOfTalent).to.equal(amountOfTalentVault);
    });
  });

  describe("#previewDeposit", async () => {
    it("Should return $TALENTVAULT equal to the number of $TALENT given", async () => {
      const amountOfTalent = 10_000n;
      const amountOfTalentVault = await talentVault.previewDeposit(amountOfTalent);
      expect(amountOfTalentVault).to.equal(amountOfTalent);
    });
  });

  describe("#deposit", async () => {
    it("Should mint $TALENTVAULT to the given receiver, equally increase the TalentVault $TALENT balance and equally decreases the $TALENT balance of receiver", async () => {
      const depositAmount = 100_000n;
      await talentToken.transfer(user1.address, depositAmount); // so that sender has enough balance
      const user1BalanceBefore = await talentToken.balanceOf(user1.address);

      await talentToken.connect(user1).approve(talentVault.address, depositAmount); // so that sender has approved vault

      const vaultBalanceBefore = await talentToken.balanceOf(talentVault.address);

      const user2BalanceMetaBefore = await talentVault.userBalanceMeta(user2.address);

      const user2TalentVaultBalanceBefore = await talentVault.balanceOf(user2.address);

      // fire
      await expect(talentVault.connect(user1).deposit(depositAmount, user2.address))
        .to.emit(talentVault, "Deposit")
        .withArgs(user1.address, user2.address, depositAmount, depositAmount);

      // user1 $TALENT balance is decreased
      const user1BalanceAfter = await talentToken.balanceOf(user1.address);
      const expectedUser1BalanceAfter = user1BalanceBefore.sub(depositAmount);
      expect(user1BalanceAfter).to.equal(expectedUser1BalanceAfter);

      // vault $TALENT balance is increased
      const vaultBalanceAfter = await talentToken.balanceOf(talentVault.address);
      const expectedVaultBalanceAfter = vaultBalanceBefore.toBigInt() + depositAmount;
      expect(vaultBalanceAfter).to.equal(expectedVaultBalanceAfter);

      // deposit for user2 is updated on storage
      const user2BalanceMetaAfter = await talentVault.userBalanceMeta(user2.address);
      expect(user2BalanceMetaAfter.depositedAmount).to.equal(
        user2BalanceMetaBefore.depositedAmount.toBigInt() + depositAmount
      );
      expect(user2BalanceMetaAfter.lastDepositAt.toNumber()).to.be.closeTo(currentDateEpochSeconds, 20);

      // user2 $TALENTVAULT balance is increased
      const user2TalentVaultBalanceAfter = await talentVault.balanceOf(user2.address);
      expect(user2TalentVaultBalanceAfter).to.equal(user2TalentVaultBalanceBefore.toBigInt() + depositAmount);
    });

    it("Should revert if $TALENT deposited is 0", async () => {
      await expect(talentVault.connect(user1).deposit(0n, user1.address)).to.be.revertedWith("InvalidDepositAmount");
    });

    it("Should revert if $TALENT deposited is greater than the max overall deposit", async () => {
      await talentVault.setMaxOverallDeposit(ethers.utils.parseEther("100000"));
      await expect(
        talentVault.connect(user1).deposit(ethers.utils.parseEther("100001"), user1.address)
      ).to.be.revertedWith("MaxOverallDepositReached");
    });

    it("Should allow deposit of amount equal to the max overall deposit", async () => {
      const maxOverallDeposit = ethers.utils.parseEther("100000");
      const totalAssetsBefore = await talentVault.totalAssets();

      await talentToken.transfer(user1.address, maxOverallDeposit.sub(totalAssetsBefore));
      await talentToken.connect(user1).approve(talentVault.address, maxOverallDeposit.sub(totalAssetsBefore));
      await talentVault.setMaxOverallDeposit(maxOverallDeposit.sub(totalAssetsBefore));
      await talentVault.connect(user1).deposit(maxOverallDeposit.sub(totalAssetsBefore), user1.address);

      expect(await talentVault.totalAssets()).to.equal(maxOverallDeposit);
    });

    it("Should allow deposit of amount greater than the max overall deposit if its increased", async () => {
      const maxOverallDeposit = ethers.utils.parseEther("100000");
      const totalAssetsBefore = await talentVault.totalAssets();

      await talentToken.transfer(user1.address, maxOverallDeposit.sub(totalAssetsBefore));
      await talentToken.connect(user1).approve(talentVault.address, maxOverallDeposit.sub(totalAssetsBefore));
      await talentVault.setMaxOverallDeposit(maxOverallDeposit.sub(totalAssetsBefore));
      await talentVault.connect(user1).deposit(maxOverallDeposit.sub(totalAssetsBefore), user1.address);

      expect(await talentVault.totalAssets()).to.equal(maxOverallDeposit);

      const nextDepositAmount = ethers.utils.parseEther("1");
      await talentVault.setMaxOverallDeposit(maxOverallDeposit.add(nextDepositAmount));
      await talentToken.transfer(user1.address, nextDepositAmount);
      await talentToken.connect(user1).approve(talentVault.address, nextDepositAmount);
      await talentVault.connect(user1).deposit(nextDepositAmount, user1.address);

      expect(await talentVault.totalAssets()).to.be.closeTo(
        maxOverallDeposit.add(nextDepositAmount),
        ethers.utils.parseEther("0.01")
      );
    });

    it("Should not allow deposit of amount that the sender does not have", async () => {
      const balanceOfUser1 = 100_000n;

      await talentToken.transfer(user1.address, balanceOfUser1);

      const depositAmount = 100_001n;

      await talentToken.connect(user1).approve(talentVault.address, depositAmount);

      await expect(talentVault.connect(user1).deposit(depositAmount, user2.address)).to.be.revertedWith(
        `ERC20InsufficientBalance("${user1.address}", ${balanceOfUser1}, ${depositAmount})`
      );
    });

    it("Should not allow deposit of amount bigger than the allowed by the sender to be spent by the talent contract", async () => {
      const depositAmount = 100_000n;

      await talentToken.transfer(user1.address, depositAmount); // so that user1 has enough balance

      const approvedAmount = depositAmount - 1n;

      await talentToken.connect(user1).approve(talentVault.address, approvedAmount);

      // fire

      await expect(talentVault.connect(user1).deposit(depositAmount, user2.address)).to.be.revertedWith(
        `ERC20InsufficientAllowance("${talentVault.address}", ${approvedAmount}, ${depositAmount})`
      );
    });

    it("Should allow deposit of amount equal to the allowed by the sender to be spent by the talent contract", async () => {
      const depositAmount = ethers.utils.parseEther("1000");

      await talentToken.transfer(user1.address, depositAmount);

      await talentToken.connect(user1).approve(talentVault.address, depositAmount);

      // fire

      await expect(talentVault.connect(user1).deposit(depositAmount, user2.address)).not.to.be.reverted;
    });
  });

  describe("#setMaxMint", async () => {
    context("when called by the owner", async () => {
      it("sets the maximum mint for the receiver", async () => {
        await talentVault.setMaxMint(user1.address, 10n);

        const mint = await talentVault.maxMint(user1.address);

        expect(mint).to.equal(10n);
      });
    });

    context("when called by a non-owner", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).setMaxMint(user2.address, 10n)).to.revertedWith(
          `OwnableUnauthorizedAccount("${user1.address}")`
        );
      });
    });
  });

  describe("#removeMaxMintLimit", async () => {
    context("when called by the owner", async () => {
      it("removes the maximum mint for the receiver", async () => {
        await talentVault.removeMaxMintLimit(user1.address);

        const mint = await talentVault.maxMint(user1.address);

        expect(mint).to.equal(ethers.constants.MaxUint256);
      });
    });

    context("when called by a non-owner", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).removeMaxMintLimit(user2.address)).to.revertedWith(
          `OwnableUnauthorizedAccount("${user1.address}")`
        );
      });
    });
  });

  describe("#setYieldSource", async () => {
    context("when called by the owner", async () => {
      it("sets the yield source", async () => {
        await talentVault.setYieldSource(user1.address);

        const yieldSource = await talentVault.yieldSource();

        expect(yieldSource).to.equal(user1.address);
      });
    });

    context("when called by a non-owner", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).setYieldSource(user2.address)).to.revertedWith(
          `OwnableUnauthorizedAccount("${user1.address}")`
        );
      });
    });
  });

  describe("#maxMint", async () => {
    context("when recipient does not have a mint limit", async () => {
      it("returns the maximum uint256", async () => {
        const maxMint = await talentVault.maxMint(user1.address);

        expect(maxMint).to.equal(ethers.constants.MaxUint256);
      });
    });

    context("when recipient has a mint limit", async () => {
      it("returns it", async () => {
        await talentVault.setMaxMint(user1.address, 5n);

        const maxMint = await talentVault.maxMint(user1.address);

        expect(maxMint).to.equal(5n);
      });
    });
  });

  describe("#previewMint", async () => {
    it("Should return $TALENT equal to the number of $TALENTVAULT given", async () => {
      const amountOfTalentVault = 10_000n;
      const amountOfTalent = await talentVault.previewMint(amountOfTalentVault);
      expect(amountOfTalent).to.equal(amountOfTalentVault);
    });
  });

  describe("#mint", async () => {
    it("Should mint $TALENTVAULT to the given receiver, equally increase the TalentVault $TALENT balance and equally decrease the $TALENT balance of receiver", async () => {
      const depositAmountInTalentVault = 10_000n;
      const equivalentDepositAmountInTalent = depositAmountInTalentVault;

      await talentToken.connect(user1).approve(talentVault.address, depositAmountInTalentVault);
      await talentToken.transfer(user1.address, depositAmountInTalentVault); // so that it has enough balance
      const user1BalanceBefore = await talentToken.balanceOf(user1.address);
      const user1BalanceInTalentVaultBefore = await talentVault.balanceOf(user1.address);
      const vaultBalanceBefore = await talentToken.balanceOf(talentVault.address);
      const userBalanceMetaBefore = await talentVault.userBalanceMeta(user1.address);
      const depositedAmountBefore = userBalanceMetaBefore.depositedAmount;

      // fire (admin deposits to itself)
      await expect(talentVault.connect(user1).mint(depositAmountInTalentVault, user1.address))
        .to.emit(talentVault, "Deposit")
        .withArgs(user1.address, user1.address, equivalentDepositAmountInTalent, depositAmountInTalentVault);

      // vault balance in TALENT is increased
      const vaultBalanceAfter = await talentToken.balanceOf(talentVault.address);
      const expectedVaultBalanceAfter = vaultBalanceBefore.toBigInt() + depositAmountInTalentVault;
      expect(vaultBalanceAfter).to.equal(expectedVaultBalanceAfter);

      // user1 balance in TALENT decreases
      const user1BalanceAfter = await talentToken.balanceOf(user1.address);
      expect(user1BalanceAfter).to.equal(user1BalanceBefore.toBigInt() - depositAmountInTalentVault);

      // user1 balance in TalentVault increases (mint result)
      const user1BalanceInTalentVaultAfter = await talentVault.balanceOf(user1.address);
      expect(user1BalanceInTalentVaultAfter).to.equal(
        user1BalanceInTalentVaultBefore.toBigInt() + equivalentDepositAmountInTalent
      );

      // user1 depositedAmount is increased
      const userBalanceMeta = await talentVault.userBalanceMeta(user1.address);
      const depositedAmountAfter = userBalanceMeta.depositedAmount;
      expect(depositedAmountAfter).to.equal(depositedAmountBefore.toBigInt() + equivalentDepositAmountInTalent);
      expect(userBalanceMeta.lastDepositAt.toNumber()).to.be.closeTo(currentDateEpochSeconds, 20);
    });

    it("Should revert if $TALENT deposited is 0", async () => {
      await expect(talentVault.connect(user1).deposit(0n, user1.address)).to.be.revertedWith("InvalidDepositAmount");
    });
  });

  describe("#maxWithdraw", async () => {
    it("returns the balance of $TALENTVAULT of the given owner", async () => {
      // just setting up some non-zero values to make test more solid
      const depositAmount = 10_000n;
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount, user1.address);
      const balance = await talentVault.balanceOf(user1.address);

      // fire
      const maxWithdraw = await talentVault.maxWithdraw(user1.address);

      expect(maxWithdraw).to.equal(balance);
    });
  });

  describe("#previewWithdraw", async () => {
    it("Should return $TALENTVAULT equal to the number of $TALENT given", async () => {
      const amountOfTalent = 10_000n;
      const amountOfTalentVault = await talentVault.previewWithdraw(amountOfTalent);
      expect(amountOfTalentVault).to.equal(amountOfTalent);
    });
  });

  describe("#withdraw", async () => {
    context("when last deposit was within the last 7 days", async () => {
      it("reverts", async () => {
        await talentToken.transfer(user1.address, 10n);
        await talentToken.connect(user1).approve(talentVault.address, 10n);
        await talentVault.connect(user1).deposit(10n, user1.address);

        // fire
        await expect(talentVault.connect(user1).withdraw(10n, user1.address, user1.address)).to.be.revertedWith(
          "CantWithdrawWithinTheLockPeriod"
        );
      });
    });

    it("burns $TALENTVAULT from owner, increases $TALENT balance of receiver, decreases $TALENT balance of TalentVault", async () => {
      const depositTalent = 10_000n;

      await talentToken.transfer(user1.address, depositTalent);
      await talentToken.connect(user1).approve(talentVault.address, depositTalent);

      let trx = await talentVault.connect(user1).deposit(depositTalent, user1.address);
      await trx.wait();

      const user1TalentVaultBalanceBefore = await talentVault.balanceOf(user1.address);
      const user1TalentBalanceBefore = await talentToken.balanceOf(user1.address);
      const talentVaultTalentBalanceBefore = await talentToken.balanceOf(talentVault.address);

      await ensureTimeIsAfterLockPeriod();

      // fire
      trx = await talentVault.connect(user1).withdraw(depositTalent, user1.address, user1.address);
      const receipt = await trx.wait();

      if (!receipt.events) {
        throw new Error("No events found");
      }

      const withdrawEvent = receipt.events.find((event) => event.event === "Withdraw");

      if (!withdrawEvent || !withdrawEvent.args) {
        throw new Error("Withdraw event not found");
      }

      const talentVaultWithDrawn = withdrawEvent.args[4];

      expect(talentVaultWithDrawn).to.equal(depositTalent);

      // user1 $TALENTVAULT balance decreases
      const user1TalentVaultBalanceAfter = await talentVault.balanceOf(user1.address);
      expect(user1TalentVaultBalanceAfter).to.equal(user1TalentVaultBalanceBefore.toBigInt() - depositTalent);

      // user1 $TALENT balance increases
      const user1TalentBalanceAfter = await talentToken.balanceOf(user1.address);
      expect(user1TalentBalanceAfter).to.equal(user1TalentBalanceBefore.toBigInt() + depositTalent);

      // TalentVault $TALENT balance decreases
      const talentVaultTalentBalanceAfter = await talentToken.balanceOf(talentVault.address);
      expect(talentVaultTalentBalanceAfter).to.equal(talentVaultTalentBalanceBefore.toBigInt() - depositTalent);
    });
  });

  describe("#maxRedeem", async () => {
    it("returns the balance of $TALENTVAULT of the given owner", async () => {
      // just setting up some non-zero values to make test more solid
      const depositAmount = 10_000n;
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount, user1.address);
      const balance = await talentVault.balanceOf(user1.address);

      // fire
      const maxRedeem = await talentVault.maxRedeem(user1.address);

      expect(maxRedeem).to.equal(balance);
    });
  });

  describe("#previewRedeem", async () => {
    it("Should return $TALENT equal to the number of $TALENTVAULT given", async () => {
      const amountOfTalentVault = 10_000n;
      const amountOfTalent = await talentVault.previewRedeem(amountOfTalentVault);
      expect(amountOfTalent).to.equal(amountOfTalentVault);
    });
  });

  describe("#redeem", async () => {
    context("when last deposit was within the last 7 days", async () => {
      it("reverts", async () => {
        await talentToken.transfer(user1.address, 10n);
        await talentToken.connect(user1).approve(talentVault.address, 10n);
        await talentVault.connect(user1).deposit(10n, user1.address);

        // fire
        await expect(talentVault.connect(user1).withdraw(10n, user1.address, user1.address)).to.be.revertedWith(
          "CantWithdrawWithinTheLockPeriod"
        );
      });
    });

    it("burns $TALENTVAULT from owner, increases $TALENT balance of receiver, decreases $TALENT balance of TalentVault", async () => {
      const depositTalent = 10_000n;
      const equivalentDepositTalentVault = depositTalent;

      await talentToken.transfer(user1.address, depositTalent);
      await talentToken.connect(user1).approve(talentVault.address, depositTalent);
      let trx = await talentVault.connect(user1).deposit(depositTalent, user1.address);
      await trx.wait();

      const user1TalentVaultBalanceBefore = await talentVault.balanceOf(user1.address);
      const user1TalentBalanceBefore = await talentToken.balanceOf(user1.address);
      const talentVaultTalentBalanceBefore = await talentToken.balanceOf(talentVault.address);

      await ensureTimeIsAfterLockPeriod();

      // fire
      trx = await talentVault.connect(user1).redeem(equivalentDepositTalentVault, user1.address, user1.address);
      const receipt = await trx.wait();

      if (!receipt.events) {
        throw new Error("No events found");
      }

      const withdrawEvent = receipt.events.find((event) => event.event === "Withdraw");

      if (!withdrawEvent || !withdrawEvent.args) {
        throw new Error("Withdraw event not found");
      }

      const talentWithDrawn = withdrawEvent.args[4];

      expect(talentWithDrawn).to.equal(equivalentDepositTalentVault);

      // user1 $TALENTVAULT balance decreases
      const user1TalentVaultBalanceAfter = await talentVault.balanceOf(user1.address);
      expect(user1TalentVaultBalanceAfter).to.equal(user1TalentVaultBalanceBefore.toBigInt() - depositTalent);

      // user1 $TALENT balance increases
      const user1TalentBalanceAfter = await talentToken.balanceOf(user1.address);
      expect(user1TalentBalanceAfter).to.equal(user1TalentBalanceBefore.toBigInt() + depositTalent);

      // TalentVault $TALENT balance decreases
      const talentVaultTalentBalanceAfter = await talentToken.balanceOf(talentVault.address);
      expect(talentVaultTalentBalanceAfter).to.equal(talentVaultTalentBalanceBefore.toBigInt() - depositTalent);
    });
  });

  describe("#refreshForAddress", async () => {
    context("when address does not have a deposit", async () => {
      it("just updates the last reward calculation", async () => {
        const lastRewardCalculationBefore = (await talentVault.userBalanceMeta(user3.address)).lastRewardCalculation;

        expect(lastRewardCalculationBefore).to.equal(0);

        // fire
        await talentVault.refreshForAddress(user3.address);

        const lastRewardCalculation = (await talentVault.userBalanceMeta(user3.address)).lastRewardCalculation;

        expect(lastRewardCalculation).not.to.equal(0);
      });
    });

    // Make sure user balance is updated according to yielded rewards. This is done in the
    // tests below, in the Rewards Calculation tests, where we call #refresh
  });

  // withdrawAll
  //
  // $TALENT for user is increased by their $TALENTVAULT balance
  // which is updated with the yield rewards.
  //
  // TalentVault $TALENT balance is reduced by the originally deposited amount
  //
  // yieldSource $TALENT balance is reduced by the yieldRewards
  //
  // user $TALENTVAULT balance goes to 0.

  describe("#withdrawAll", async () => {
    it("withdraw all the $TALENTVAULT and converts them to $TALENT", async () => {
      const depositAmount = ethers.utils.parseEther("1000");
      // from admin we make user1 have some $TALENT
      await talentToken.transfer(user1.address, depositAmount);
      // user1 approves talentVault to spend $TALENT
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      // user1 deposits to TalentVault
      // This makes user1 $TALENT to be decreased by depositAmount
      // and TalentVault $TALENT to be increased by depositAmount
      // and user1 $TALENTVAULT to be increased by depositAmount
      await talentVault.connect(user1).deposit(depositAmount, user1.address);

      const talentVaultTalentBalanceBefore = await talentToken.balanceOf(talentVault.address);
      const yieldSourceTalentBalanceBefore = await talentToken.balanceOf(yieldSource.address);

      const user1TalentVaultBalanceBefore = await talentVault.balanceOf(user1.address);
      expect(user1TalentVaultBalanceBefore).to.equal(depositAmount);

      // Simulate time passing
      ensureTimestamp(currentDateEpochSeconds + 31536000); // 1 year ahead

      const yieldedRewards = yieldBasePerDay.mul(90); // 5% rewards but over 90 days

      // this is manually calculated, but it is necessary for this test.
      const expectedUser1TalentVaultBalanceAfter1Year = depositAmount.add(yieldedRewards);

      // fire
      await talentVault.connect(user1).withdrawAll();

      // TalentVault $TALENT balance is reduced by the originally deposited amount
      const talentVaultTalentBalanceAfter = await talentToken.balanceOf(talentVault.address);
      const expectedTalentVaultTalentBalanceAfter = talentVaultTalentBalanceBefore.sub(depositAmount);
      expect(talentVaultTalentBalanceAfter).to.equal(expectedTalentVaultTalentBalanceAfter);

      // user1 $TALENT balance is increased
      const user1TalentBalanceAfter = await talentToken.balanceOf(user1.address);
      expect(user1TalentBalanceAfter).to.be.closeTo(
        expectedUser1TalentVaultBalanceAfter1Year,
        ethers.utils.parseEther("0.01")
      );

      // user1 $TALENTVAULT balance goes to 0
      const user1TalentVaultBalanceAfter = await talentVault.balanceOf(user1.address);
      expect(user1TalentVaultBalanceAfter).to.equal(0);

      // yieldSource $TALENT balance is decreased by the yieldRewards
      const yieldSourceTalentBalanceAfter = await talentToken.balanceOf(yieldSource.address);
      const expectedYieldSourceTalentBalanceAfter = yieldSourceTalentBalanceBefore.sub(yieldedRewards);
      expect(yieldSourceTalentBalanceAfter).to.be.closeTo(
        expectedYieldSourceTalentBalanceAfter,
        ethers.utils.parseEther("0.01")
      );
    });
  });

  describe("Rewards Calculation", async () => {
    it("Should calculate rewards correctly", async () => {
      const depositAmount = ethers.utils.parseEther("1000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount, user1.address);

      // Simulate time passing
      ensureTimestamp(currentDateEpochSeconds + 31536000); // 1 year ahead

      const expectedRewards = yieldBasePerDay.mul(90); // 5% rewards but over 90 days

      // fire
      await talentVault.connect(user1).refresh();

      const userBalance = await talentVault.balanceOf(user1.address);
      expect(userBalance).to.be.closeTo(depositAmount.add(expectedRewards), ethers.utils.parseEther("0.01"));

      const userLastRewardCalculation = (await talentVault.userBalanceMeta(user1.address)).lastRewardCalculation;
      const oneYearAfterEpochSeconds = currentDateEpochSeconds + 31536000;

      expect(userLastRewardCalculation.toNumber()).to.equal(oneYearAfterEpochSeconds);
    });

    context("when yielding rewards is stopped", async () => {
      it("does not yield any rewards but it updates the lastRewardCalculation", async () => {
        const depositAmount = ethers.utils.parseEther("1000");
        await talentToken.transfer(user1.address, depositAmount);
        const user1BalanceBefore = await talentToken.balanceOf(user1.address);
        await talentToken.connect(user1).approve(talentVault.address, depositAmount);
        await talentVault.connect(user1).deposit(depositAmount, user1.address);

        await talentVault.stopYieldingRewards();

        // Simulate time passing

        ensureTimestamp(currentDateEpochSeconds + 31536000); // 1 year ahead

        // fire
        await talentVault.connect(user1).refresh();

        const user1BalanceAfter = await talentVault.balanceOf(user1.address);
        expect(user1BalanceAfter).to.equal(user1BalanceBefore);

        const userLastRewardCalculation = (await talentVault.userBalanceMeta(user1.address)).lastRewardCalculation;
        const oneYearAfterEpochSeconds = currentDateEpochSeconds + 31536000;

        expect(userLastRewardCalculation.toNumber()).to.equal(oneYearAfterEpochSeconds);
      });
    });

    it("Should calculate rewards correctly for builders with scores below 60", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      const depositAmount = ethers.utils.parseEther("1000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount, user1.address);

      // Simulate time passing
      ensureTimestamp(currentDateEpochSeconds + 31536000); // 1 year ahead
      await passportBuilderScore.setScore(passportId, 55); // Set builder score below 50

      // fire
      await talentVault.connect(user1).refresh();

      const expectedRewards = yieldBasePerDay.mul(90); // 5% rewards but over 90 days
      const userBalance = await talentVault.balanceOf(user1.address);
      expect(userBalance).to.be.closeTo(depositAmount.add(expectedRewards), ethers.utils.parseEther("0.1"));
    });

    it("Should calculate rewards correctly for builders with scores above 60 (inclusive)", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 60); // Set builder score above 60
      const depositAmount = ethers.utils.parseEther("1000");
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount, user1.address);

      // Simulate time passing
      ensureTimestamp(currentDateEpochSeconds + 31536000); // 1 year ahead
      await passportBuilderScore.setScore(passportId, 60); // Set builder score above 60

      // fire
      await talentVault.connect(user1).refresh();

      const expectedRewards = yieldBasePerDay.mul(2).mul(90); // 10% rewards but over 90 days
      const userBalance = await talentVault.balanceOf(user1.address);
      expect(userBalance).to.be.closeTo(depositAmount.add(expectedRewards), ethers.utils.parseEther("0.1"));
    });
  });

  describe("#setYieldRate", async () => {
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

  describe("#stopYieldingRewards", async () => {
    context("when called by an non-owner account", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).stopYieldingRewards()).to.be.revertedWith(
          `OwnableUnauthorizedAccount("${user1.address}")`
        );
      });
    });

    context("when called by the owner account", async () => {
      it("stops yielding rewards", async () => {
        await talentVault.stopYieldingRewards();

        expect(await talentVault.yieldRewardsFlag()).to.equal(false);
      });
    });
  });

  describe("#maxOverallDeposit", async () => {
    context("when called by an non-owner account", async () => {
      it("reverts", async () => {
        await expect(
          talentVault.connect(user1).setMaxOverallDeposit(ethers.utils.parseEther("100000"))
        ).to.be.revertedWith(`OwnableUnauthorizedAccount("${user1.address}")`);
      });
    });

    context("when called by the owner account", async () => {
      it("sets the max overall deposit", async () => {
        await talentVault.setMaxOverallDeposit(ethers.utils.parseEther("500000"));

        expect(await talentVault.maxOverallDeposit()).to.equal(ethers.utils.parseEther("500000"));
      });
    });
  });

  describe("#startYieldingRewards", async () => {
    context("when called by an non-owner account", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).startYieldingRewards()).to.be.revertedWith(
          `OwnableUnauthorizedAccount("${user1.address}")`
        );
      });
    });

    context("when called by the owner account", async () => {
      it("starts yielding rewards", async () => {
        await talentVault.startYieldingRewards();

        expect(await talentVault.yieldRewardsFlag()).to.equal(true);
      });
    });
  });

  describe("#setLockPeriod", async () => {
    context("when called by a non-owner account", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).setLockPeriod(3)).to.be.revertedWith(
          `OwnableUnauthorizedAccount("${user1.address}")`
        );
      });
    });

    context("when called by the owner account", async () => {
      it("sets the lock period as days given", async () => {
        await talentVault.setLockPeriod(10);

        expect(await talentVault.lockPeriod()).to.equal(10 * 24 * 60 * 60);
      });
    });
  });
});
