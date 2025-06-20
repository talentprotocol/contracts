import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { MultiSendETH } from "../../../typechain-types";
import { Artifacts } from "../../shared";

import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("MultiSendETH", () => {
  let deployer: SignerWithAddress;
  let sender: SignerWithAddress;
  let recipient1: SignerWithAddress;
  let recipient2: SignerWithAddress;
  let recipient3: SignerWithAddress;

  let multiSendETH: MultiSendETH;

  beforeEach(async () => {
    [deployer, sender, recipient1, recipient2, recipient3] = await ethers.getSigners();
  });

  async function deployMultiSendETH() {
    return deployContract(deployer, Artifacts.MultiSendETH, []);
  }

  describe("Contract deployment", () => {
    beforeEach(async () => {
      multiSendETH = (await deployMultiSendETH()) as MultiSendETH;
    });

    it("should deploy with correct constants", async () => {
      expect(await multiSendETH.ARRAY_LIMIT()).to.eq(200);
    });
  });

  describe("multisendETH function", () => {
    beforeEach(async () => {
      multiSendETH = (await deployMultiSendETH()) as MultiSendETH;
    });

    describe("Successful transfers", () => {
      it("should send ETH to single recipient", async () => {
        const recipients = [recipient1.address];
        const amounts = [ethers.utils.parseEther("1")];
        const totalAmount = ethers.utils.parseEther("1");

        const initialBalance = await recipient1.getBalance();

        const tx = await multiSendETH.connect(sender).multisendETH(recipients, amounts, { value: totalAmount });

        const finalBalance = await recipient1.getBalance();
        expect(finalBalance.sub(initialBalance)).to.eq(ethers.utils.parseEther("1"));

        // Check events
        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });

      it("should send ETH to multiple recipients with different amounts", async () => {
        const recipients = [recipient1.address, recipient2.address, recipient3.address];
        const amounts = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("0.5")];
        const totalAmount = ethers.utils.parseEther("3.5");

        const initialBalances = [
          await recipient1.getBalance(),
          await recipient2.getBalance(),
          await recipient3.getBalance(),
        ];

        const tx = await multiSendETH.connect(sender).multisendETH(recipients, amounts, { value: totalAmount });

        const finalBalances = [
          await recipient1.getBalance(),
          await recipient2.getBalance(),
          await recipient3.getBalance(),
        ];

        expect(finalBalances[0].sub(initialBalances[0])).to.eq(ethers.utils.parseEther("1"));
        expect(finalBalances[1].sub(initialBalances[1])).to.eq(ethers.utils.parseEther("2"));
        expect(finalBalances[2].sub(initialBalances[2])).to.eq(ethers.utils.parseEther("0.5"));

        // Check events
        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });

      it("should handle maximum array length", async () => {
        const arrayLength = 200; // ARRAY_LIMIT
        const recipients: string[] = [];
        const amounts: BigNumber[] = [];
        const amountPerRecipient = ethers.utils.parseEther("0.01");

        // Create arrays with max length
        for (let i = 0; i < arrayLength; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(amountPerRecipient);
        }

        const totalAmount = amountPerRecipient.mul(arrayLength);

        const tx = await multiSendETH.connect(sender).multisendETH(recipients, amounts, { value: totalAmount });

        const multisentEvent = await findEvent(tx, "Multisended");
        expect(multisentEvent?.args?.total).to.eq(totalAmount);
      });
    });

    describe("Validation failures", () => {
      it("should revert with mismatched arrays", async () => {
        const recipients = [recipient1.address, recipient2.address];
        const amounts = [ethers.utils.parseEther("1")]; // Only one amount for two recipients

        await expect(
          multiSendETH.connect(sender).multisendETH(recipients, amounts, { value: ethers.utils.parseEther("1") })
        ).to.be.revertedWith("Mismatched arrays");
      });

      it("should revert when array length exceeds limit", async () => {
        const arrayLength = 201; // Exceeds ARRAY_LIMIT
        const recipients: string[] = [];
        const amounts = [];

        for (let i = 0; i < arrayLength; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(ethers.utils.parseEther("0.01"));
        }

        await expect(
          multiSendETH.connect(sender).multisendETH(recipients, amounts, { value: ethers.utils.parseEther("2.01") })
        ).to.be.revertedWith("Array length exceeds limit");
      });

      it("should revert when total doesn't match msg.value (too little sent)", async () => {
        const recipients = [recipient1.address, recipient2.address];
        const amounts = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
        const insufficientValue = ethers.utils.parseEther("1.5"); // Less than total (2 ETH)

        await expect(
          multiSendETH.connect(sender).multisendETH(recipients, amounts, { value: insufficientValue })
        ).to.be.revertedWith("Transfer failed");
      });

      it("should revert when total doesn't match msg.value (too much sent)", async () => {
        const recipients = [recipient1.address];
        const amounts = [ethers.utils.parseEther("1")];
        const excessiveValue = ethers.utils.parseEther("2"); // More than total (1 ETH)

        await expect(
          multiSendETH.connect(sender).multisendETH(recipients, amounts, { value: excessiveValue })
        ).to.be.revertedWith("Incorrect ETH amount sent");
      });
    });
  });

  describe("Gas optimization tests", () => {
    beforeEach(async () => {
      multiSendETH = (await deployMultiSendETH()) as MultiSendETH;
    });

    it("should have reasonable gas consumption for different array sizes", async () => {
      const testSizes = [1, 5, 10, 50, 100];

      for (const size of testSizes) {
        const recipients: string[] = [];
        const amounts = [];
        const amountPerRecipient = ethers.utils.parseEther("0.01");

        for (let i = 0; i < size; i++) {
          recipients.push(ethers.Wallet.createRandom().address);
          amounts.push(amountPerRecipient);
        }

        const totalAmount = amountPerRecipient.mul(size);

        const tx = await multiSendETH.connect(sender).multisendETH(recipients, amounts, { value: totalAmount });

        const receipt = await tx.wait();
        console.log(`Gas used for ${size} recipients: ${receipt.gasUsed.toString()}`);

        // Ensure transaction succeeded
        expect(receipt.status).to.eq(1);
      }
    });
  });
});
