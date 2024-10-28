import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import { any } from "hardhat/internal/core/params/argumentTypes";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PassportRegistry, PassportWalletRegistry } from "../../../typechain-types";
import { Artifacts } from "../../shared";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("PassportWalletRegistry", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  let passportRegistry: PassportRegistry;
  let passportWalletRegistry: PassportWalletRegistry;

  beforeEach(async () => {
    [admin, user1, user2] = await ethers.getSigners();
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportWalletRegistry = (await deployContract(admin, Artifacts.PassportWalletRegistry, [
      admin.address,
      passportRegistry.address,
    ])) as PassportWalletRegistry;
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await passportWalletRegistry.owner()).to.equal(admin.address);
    });

    it("Should set the correct PassportRegistry address", async () => {
      expect(await passportWalletRegistry.passportRegistry()).to.equal(passportRegistry.address);
    });
  });

  describe("Adding and Getting Wallets", () => {
    beforeEach(async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
    });

    it("Should set and get the passport ID for a wallet", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      expect(passportId).to.equal(1);

      await passportWalletRegistry.connect(user1).addWallet(user2.address, passportId);
      const walletPassportId = await passportWalletRegistry.passportId(user2.address);
      expect(walletPassportId).to.equal(passportId);
    });

    it("Should emit WalletAdded event when adding a wallet", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      expect(passportId).to.equal(1);

      const tx = await passportWalletRegistry.connect(user1).addWallet(user2.address, passportId);

      // Wait for the transaction receipt to access the event logs
      const receipt = await tx.wait();

      if (!receipt.events) {
        throw new Error("No events found in the receipt");
      }

      // Access the event logs for the "ScoreUpdated" event
      const event = receipt.events.find((e) => e.event === "WalletAdded");

      if (!event || !event.args || event.args.length < 2) {
        throw new Error("WalletAdded event not found in the receipt");
      }

      expect(event.args[0]).to.equal(user2.address); // wallet
      expect(event.args[1]).to.equal(passportId); // passportId
    });

    it("Should not allow non-owner to use adminAddWallet", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await expect(passportWalletRegistry.connect(user1).adminAddWallet(user2.address, passportId)).to.be.revertedWith(
        `OwnableUnauthorizedAccount("${user1.address}")`
      );
    });

    it("Should revert if adding a wallet for a non-existent passport ID", async () => {
      await expect(passportWalletRegistry.connect(admin).adminAddWallet(user2.address, 9999)).to.be.revertedWith(
        "Passport ID does not exist"
      );
    });

    it("Should return 0 for a passport ID with no wallet set", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      expect(passportId).to.equal(1);

      const walletPassportId = await passportWalletRegistry.passportId(user2.address);
      expect(walletPassportId).to.equal(0);
    });

    it("Should not allow non-owner to use adminRemoveWallet", async () => {
      await expect(passportWalletRegistry.connect(user1).adminRemoveWallet(user2.address)).to.be.revertedWith(
        `OwnableUnauthorizedAccount("${user1.address}")`
      );
    });

    it("Should revert if removing a wallet for a non-existent passport ID", async () => {
      await expect(passportWalletRegistry.connect(admin).adminRemoveWallet(user2.address)).to.be.revertedWith(
        "Passport does not exist"
      );
    });

    it("Should emit WalletRemoved event when removing a wallet", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportWalletRegistry.connect(user1).addWallet(user2.address, passportId);

      expect(await passportWalletRegistry.passportId(user2.address)).to.equal(passportId);

      const tx = await passportWalletRegistry.connect(admin).adminRemoveWallet(user2.address);

      // Wait for the transaction receipt to access the event logs
      const receipt = await tx.wait();

      if (!receipt.events) {
        throw new Error("No events found in the receipt");
      }

      const event = receipt.events.find((e) => e.event === "WalletRemoved");

      if (!event || !event.args || event.args.length < 2) {
        throw new Error("WalletRemoved event not found in the receipt");
      }

      expect(event.args[0]).to.equal(user2.address); // wallet
      expect(event.args[1]).to.equal(passportId); // passportId

      expect(await passportWalletRegistry.passportId(user2.address)).to.equal(0);
    });

    it("Should revert if removing a wallet that is not set", async () => {
      await expect(passportWalletRegistry.connect(admin).adminRemoveWallet(user2.address)).to.be.revertedWith(
        "Passport does not exist"
      );
    });

    it("Should allow owner of passport to remove wallet", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);

      await passportWalletRegistry.connect(user1).addWallet(user2.address, passportId);

      const newWalletPassportId = await passportWalletRegistry.passportId(user2.address);
      expect(newWalletPassportId).to.equal(passportId);

      await passportWalletRegistry.connect(user2).removeWallet();

      const walletPassportId2 = await passportWalletRegistry.passportId(user2.address);
      expect(walletPassportId2).to.equal(0);
    });
  });

  describe("Changing PassportRegistry", () => {
    let newPassportRegistry: PassportRegistry;

    beforeEach(async () => {
      newPassportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [
        admin.address,
      ])) as PassportRegistry;
    });

    it("Should allow the owner to change the PassportRegistry address", async () => {
      await passportWalletRegistry.setPassportRegistry(newPassportRegistry.address);
      expect(await passportWalletRegistry.passportRegistry()).to.equal(newPassportRegistry.address);
    });

    it("Should emit PassportRegistryChanged event when changing the address", async () => {
      await expect(passportWalletRegistry.setPassportRegistry(newPassportRegistry.address))
        .to.emit(passportWalletRegistry, "PassportRegistryChanged")
        .withArgs(passportRegistry.address, newPassportRegistry.address);
    });

    it("Should not allow non-owner to change the PassportRegistry address", async () => {
      await expect(
        passportWalletRegistry.connect(user1).setPassportRegistry(newPassportRegistry.address)
      ).to.be.revertedWith(`OwnableUnauthorizedAccount("${user1.address}")`);
    });

    it("Should revert if the new address is the zero address", async () => {
      await expect(
        passportWalletRegistry.connect(admin).setPassportRegistry(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid address");
    });
  });
});
