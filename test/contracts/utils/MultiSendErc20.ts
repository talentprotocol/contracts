import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { MultiSendErc20, ERC20Mock as ERC20MockType } from "../../../typechain-types";
import { Artifacts } from "../../shared";

import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("MultiSendErc20", () => {
  let deployer: SignerWithAddress;
  let sender: SignerWithAddress;
  let recipient1: SignerWithAddress;
  let recipient2: SignerWithAddress;
  let recipient3: SignerWithAddress;

  let multiSendErc20: MultiSendErc20;
  let token: ERC20MockType;

  beforeEach(async () => {
    [deployer, sender, recipient1, recipient2, recipient3] = await ethers.getSigners();
  });

  async function deployMultiSendErc20() {
    return deployContract(deployer, Artifacts.MultiSendErc20, []);
  }

  async function deployToken() {
    return deployContract(deployer, Artifacts.ERC20Mock, ["MockToken", "MTK"]);
  }

  describe("Contract deployment", () => {
    beforeEach(async () => {
      multiSendErc20 = (await deployMultiSendErc20()) as MultiSendErc20;
    });

    it("should deploy with correct constants", async () => {
      expect(await multiSendErc20.ARRAY_LIMIT()).to.eq(200);
    });
  });

  describe("multisendERC20 function", () => {
    beforeEach(async () => {
      multiSendErc20 = (await deployMultiSendErc20()) as MultiSendErc20;
      token = (await deployToken()) as unknown as ERC20MockType;
    });

    async function fundSenderAndApprove(totalAmount: BigNumber) {
      await token.connect(deployer).transfer(sender.address, totalAmount);
      await token.connect(sender).approve(multiSendErc20.address, totalAmount);
    }

    describe("Successful transfers", () => {
      it("should send tokens to single recipient", async () => {
        const recipients = [recipient1.address];
        const amounts = [ethers.utils.parseUnits("100", 18)];
        const totalAmount = amounts[0];

        const initialBalance = await token.balanceOf(recipient1.address);

        await fundSenderAndApprove(totalAmount);

        const tx = await multiSendErc20.connect(sender).multisendERC20(token.address, recipients, amounts);

        const finalBalance = await token.balanceOf(recipient1.address);
        expect(finalBalance.sub(initialBalance)).to.eq(totalAmount);

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });

      it("should send tokens to multiple recipients with different amounts", async () => {
        const recipients = [recipient1.address, recipient2.address, recipient3.address];
        const amounts = [
          ethers.utils.parseUnits("10", 18),
          ethers.utils.parseUnits("20", 18),
          ethers.utils.parseUnits("5", 18),
        ];
        const totalAmount = amounts[0].add(amounts[1]).add(amounts[2]);

        const initialBalances = [
          await token.balanceOf(recipient1.address),
          await token.balanceOf(recipient2.address),
          await token.balanceOf(recipient3.address),
        ];

        await fundSenderAndApprove(totalAmount);

        const tx = await multiSendErc20.connect(sender).multisendERC20(token.address, recipients, amounts);

        const finalBalances = [
          await token.balanceOf(recipient1.address),
          await token.balanceOf(recipient2.address),
          await token.balanceOf(recipient3.address),
        ];

        expect(finalBalances[0].sub(initialBalances[0])).to.eq(amounts[0]);
        expect(finalBalances[1].sub(initialBalances[1])).to.eq(amounts[1]);
        expect(finalBalances[2].sub(initialBalances[2])).to.eq(amounts[2]);

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });

      it("should handle maximum array length", async () => {
        const arrayLength = 200; // ARRAY_LIMIT
        const recipients: string[] = [];
        const amounts: BigNumber[] = [];
        const amountPerRecipient = ethers.utils.parseUnits("1", 18);

        for (let i = 0; i < arrayLength; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(amountPerRecipient);
        }

        const totalAmount = amountPerRecipient.mul(arrayLength);

        await fundSenderAndApprove(totalAmount);

        const tx = await multiSendErc20.connect(sender).multisendERC20(token.address, recipients, amounts);

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });
    });

    describe("Validation failures", () => {
      it("should revert with mismatched arrays", async () => {
        const recipients = [recipient1.address, recipient2.address];
        const amounts = [ethers.utils.parseUnits("1", 18)];

        await token.connect(deployer).transfer(sender.address, ethers.utils.parseUnits("1", 18));

        await expect(multiSendErc20.connect(sender).multisendERC20(token.address, recipients, amounts)).to.be.reverted; // Custom error: MismatchedArrays
      });

      it("should revert when array length exceeds limit", async () => {
        const arrayLength = 201; // Exceeds ARRAY_LIMIT
        const recipients: string[] = [];
        const amounts: BigNumber[] = [];

        for (let i = 0; i < arrayLength; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(ethers.utils.parseUnits("1", 18));
        }

        await token.connect(deployer).transfer(sender.address, ethers.utils.parseUnits("201", 18));

        await expect(multiSendErc20.connect(sender).multisendERC20(token.address, recipients, amounts)).to.be.reverted; // Custom error: ArrayLengthExceedsLimit
      });
    });
  });

  describe("Gas optimization tests", () => {
    beforeEach(async () => {
      multiSendErc20 = (await deployMultiSendErc20()) as MultiSendErc20;
      token = (await deployToken()) as unknown as ERC20MockType;
    });

    it("should have reasonable gas consumption for different array sizes", async () => {
      const testSizes = [1, 5, 10, 50, 100];

      for (const size of testSizes) {
        const recipients: string[] = [];
        const amounts: BigNumber[] = [];
        const amountPerRecipient = ethers.utils.parseUnits("1", 18);

        for (let i = 0; i < size; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(amountPerRecipient);
        }

        const totalAmount = amountPerRecipient.mul(size);
        await token.connect(deployer).transfer(sender.address, totalAmount);
        await token.connect(sender).approve(multiSendErc20.address, totalAmount);

        const tx = await multiSendErc20.connect(sender).multisendERC20(token.address, recipients, amounts);
        const receipt = await tx.wait();
        console.log(`Gas used for ${size} recipients: ${receipt.gasUsed.toString()}`);
        expect(receipt.status).to.eq(1);
      }
    });
  });

  describe("multisendERC20From function", () => {
    beforeEach(async () => {
      multiSendErc20 = (await deployMultiSendErc20()) as MultiSendErc20;
      token = (await deployToken()) as unknown as ERC20MockType;
    });

    async function fundSenderAndApprove(totalAmount: BigNumber) {
      await token.connect(deployer).transfer(sender.address, totalAmount);
      await token.connect(sender).approve(multiSendErc20.address, totalAmount);
    }

    describe("Successful transfers", () => {
      it("should send tokens to single recipient using transferFrom per recipient", async () => {
        const recipients = [recipient1.address];
        const amounts = [ethers.utils.parseUnits("100", 18)];
        const totalAmount = amounts[0];

        const initialBalance = await token.balanceOf(recipient1.address);

        await fundSenderAndApprove(totalAmount);

        const tx = await multiSendErc20
          .connect(sender)
          .multisendERC20From(token.address, recipients, amounts);

        const finalBalance = await token.balanceOf(recipient1.address);
        expect(finalBalance.sub(initialBalance)).to.eq(totalAmount);

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });

      it("should send tokens to multiple recipients with different amounts using transferFrom per recipient", async () => {
        const recipients = [recipient1.address, recipient2.address, recipient3.address];
        const amounts = [
          ethers.utils.parseUnits("10", 18),
          ethers.utils.parseUnits("20", 18),
          ethers.utils.parseUnits("5", 18),
        ];
        const totalAmount = amounts[0].add(amounts[1]).add(amounts[2]);

        const initialBalances = [
          await token.balanceOf(recipient1.address),
          await token.balanceOf(recipient2.address),
          await token.balanceOf(recipient3.address),
        ];

        await fundSenderAndApprove(totalAmount);

        const tx = await multiSendErc20
          .connect(sender)
          .multisendERC20From(token.address, recipients, amounts);

        const finalBalances = [
          await token.balanceOf(recipient1.address),
          await token.balanceOf(recipient2.address),
          await token.balanceOf(recipient3.address),
        ];

        expect(finalBalances[0].sub(initialBalances[0])).to.eq(amounts[0]);
        expect(finalBalances[1].sub(initialBalances[1])).to.eq(amounts[1]);
        expect(finalBalances[2].sub(initialBalances[2])).to.eq(amounts[2]);

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });

      it("should handle maximum array length", async () => {
        const arrayLength = 200; // ARRAY_LIMIT
        const recipients: string[] = [];
        const amounts: BigNumber[] = [];
        const amountPerRecipient = ethers.utils.parseUnits("1", 18);

        for (let i = 0; i < arrayLength; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(amountPerRecipient);
        }

        const totalAmount = amountPerRecipient.mul(arrayLength);

        await fundSenderAndApprove(totalAmount);

        const tx = await multiSendErc20
          .connect(sender)
          .multisendERC20From(token.address, recipients, amounts);

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });
    });

    describe("Validation failures", () => {
      it("should revert with mismatched arrays", async () => {
        const recipients = [recipient1.address, recipient2.address];
        const amounts = [ethers.utils.parseUnits("1", 18)];

        await token.connect(deployer).transfer(sender.address, ethers.utils.parseUnits("1", 18));

        await expect(
          multiSendErc20
            .connect(sender)
            .multisendERC20From(token.address, recipients, amounts)
        ).to.be.reverted; // Custom error: MismatchedArrays
      });

      it("should revert when array length exceeds limit", async () => {
        const arrayLength = 201; // Exceeds ARRAY_LIMIT
        const recipients: string[] = [];
        const amounts: BigNumber[] = [];

        for (let i = 0; i < arrayLength; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(ethers.utils.parseUnits("1", 18));
        }

        await token.connect(deployer).transfer(sender.address, ethers.utils.parseUnits("201", 18));

        await expect(
          multiSendErc20
            .connect(sender)
            .multisendERC20From(token.address, recipients, amounts)
        ).to.be.reverted; // Custom error: ArrayLengthExceedsLimit
      });
    });

    describe("Gas optimization tests (transferFrom per recipient)", () => {
      beforeEach(async () => {
        // already deployed in outer beforeEach
      });

      it("should log gas for different array sizes", async () => {
        const testSizes = [1, 5, 10, 50, 100];

        for (const size of testSizes) {
          const recipients: string[] = [];
          const amounts: BigNumber[] = [];
          const amountPerRecipient = ethers.utils.parseUnits("1", 18);

          for (let i = 0; i < size; i++) {
            recipients.push(ethers.Wallet.createRandom().address);
            amounts.push(amountPerRecipient);
          }

          const totalAmount = amountPerRecipient.mul(size);
          await token.connect(deployer).transfer(sender.address, totalAmount);
          await token.connect(sender).approve(multiSendErc20.address, totalAmount);

          const tx = await multiSendErc20
            .connect(sender)
            .multisendERC20From(token.address, recipients, amounts);
          const receipt = await tx.wait();
          console.log(
            `Gas used (transferFrom-per-recipient) for ${size} recipients: ${receipt.gasUsed.toString()}`
          );
          expect(receipt.status).to.eq(1);
        }
      });
    });
  });

  describe("multisendERC20Unsafe function", () => {
    beforeEach(async () => {
      multiSendErc20 = (await deployMultiSendErc20()) as MultiSendErc20;
      token = (await deployToken()) as unknown as ERC20MockType;
    });

    async function fundSenderAndApprove(totalAmount: BigNumber) {
      await token.connect(deployer).transfer(sender.address, totalAmount);
      await token.connect(sender).approve(multiSendErc20.address, totalAmount);
    }

    describe("Successful transfers", () => {
      it("should send tokens to single recipient using raw transfers", async () => {
        const recipients = [recipient1.address];
        const amounts = [ethers.utils.parseUnits("100", 18)];
        const totalAmount = amounts[0];

        const initialBalance = await token.balanceOf(recipient1.address);

        await fundSenderAndApprove(totalAmount);

        const tx = await multiSendErc20
          .connect(sender)
          .multisendERC20Unsafe(token.address, recipients, amounts);

        const finalBalance = await token.balanceOf(recipient1.address);
        expect(finalBalance.sub(initialBalance)).to.eq(totalAmount);

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });

      it("should send tokens to multiple recipients with different amounts using raw transfers", async () => {
        const recipients = [recipient1.address, recipient2.address, recipient3.address];
        const amounts = [
          ethers.utils.parseUnits("10", 18),
          ethers.utils.parseUnits("20", 18),
          ethers.utils.parseUnits("5", 18),
        ];
        const totalAmount = amounts[0].add(amounts[1]).add(amounts[2]);

        const initialBalances = [
          await token.balanceOf(recipient1.address),
          await token.balanceOf(recipient2.address),
          await token.balanceOf(recipient3.address),
        ];

        await fundSenderAndApprove(totalAmount);

        const tx = await multiSendErc20
          .connect(sender)
          .multisendERC20Unsafe(token.address, recipients, amounts);

        const finalBalances = [
          await token.balanceOf(recipient1.address),
          await token.balanceOf(recipient2.address),
          await token.balanceOf(recipient3.address),
        ];

        expect(finalBalances[0].sub(initialBalances[0])).to.eq(amounts[0]);
        expect(finalBalances[1].sub(initialBalances[1])).to.eq(amounts[1]);
        expect(finalBalances[2].sub(initialBalances[2])).to.eq(amounts[2]);

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });

      it("should handle maximum array length", async () => {
        const arrayLength = 200; // ARRAY_LIMIT
        const recipients: string[] = [];
        const amounts: BigNumber[] = [];
        const amountPerRecipient = ethers.utils.parseUnits("1", 18);

        for (let i = 0; i < arrayLength; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(amountPerRecipient);
        }

        const totalAmount = amountPerRecipient.mul(arrayLength);

        await fundSenderAndApprove(totalAmount);

        const tx = await multiSendErc20
          .connect(sender)
          .multisendERC20Unsafe(token.address, recipients, amounts);

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });
    });

    describe("Validation failures", () => {
      it("should revert with mismatched arrays", async () => {
        const recipients = [recipient1.address, recipient2.address];
        const amounts = [ethers.utils.parseUnits("1", 18)];

        await token.connect(deployer).transfer(sender.address, ethers.utils.parseUnits("1", 18));

        await expect(
          multiSendErc20
            .connect(sender)
            .multisendERC20Unsafe(token.address, recipients, amounts)
        ).to.be.reverted; // Custom error: MismatchedArrays
      });

      it("should revert when array length exceeds limit", async () => {
        const arrayLength = 201; // Exceeds ARRAY_LIMIT
        const recipients: string[] = [];
        const amounts: BigNumber[] = [];

        for (let i = 0; i < arrayLength; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(ethers.utils.parseUnits("1", 18));
        }

        await token.connect(deployer).transfer(sender.address, ethers.utils.parseUnits("201", 18));

        await expect(
          multiSendErc20
            .connect(sender)
            .multisendERC20Unsafe(token.address, recipients, amounts)
        ).to.be.reverted; // Custom error: ArrayLengthExceedsLimit
      });
    });

    describe("Gas optimization tests (unsafe)", () => {
      beforeEach(async () => {
        // already deployed in outer beforeEach
      });

      it("should log gas for different array sizes", async () => {
        const testSizes = [1, 5, 10, 50, 100];

        for (const size of testSizes) {
          const recipients: string[] = [];
          const amounts: BigNumber[] = [];
          const amountPerRecipient = ethers.utils.parseUnits("1", 18);

          for (let i = 0; i < size; i++) {
            recipients.push(ethers.Wallet.createRandom().address);
            amounts.push(amountPerRecipient);
          }

          const totalAmount = amountPerRecipient.mul(size);
          await token.connect(deployer).transfer(sender.address, totalAmount);
          await token.connect(sender).approve(multiSendErc20.address, totalAmount);

          const tx = await multiSendErc20
            .connect(sender)
            .multisendERC20Unsafe(token.address, recipients, amounts);
          const receipt = await tx.wait();
          console.log(
            `Gas used (unsafe/raw) for ${size} recipients: ${receipt.gasUsed.toString()}`
          );
          expect(receipt.status).to.eq(1);
        }
      });
    });
  });
});
