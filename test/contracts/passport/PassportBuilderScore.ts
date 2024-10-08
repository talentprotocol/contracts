import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import { any } from "hardhat/internal/core/params/argumentTypes";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PassportRegistry, PassportBuilderScore } from "../../../typechain-types";
import { Artifacts } from "../../shared";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("PassportBuilderScore", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  let passportRegistry: PassportRegistry;
  let passportBuilderScore: PassportBuilderScore;

  beforeEach(async () => {
    [admin, user1, user2] = await ethers.getSigners();
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportBuilderScore = (await deployContract(admin, Artifacts.PassportBuilderScore, [
      passportRegistry.address,
      admin.address,
    ])) as PassportBuilderScore;
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await passportBuilderScore.owner()).to.equal(admin.address);
    });

    it("Should set the correct PassportRegistry address", async () => {
      expect(await passportBuilderScore.passportRegistry()).to.equal(passportRegistry.address);
    });
  });

  describe("Setting and Getting Scores", () => {
    beforeEach(async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
    });

    it("Should set and get the score for a passport ID", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      expect(passportId).to.equal(1);

      await passportBuilderScore.setScore(passportId, 100);
      const score = await passportBuilderScore.getScore(passportId);
      expect(score).to.equal(100);
    });

    it("Should emit ScoreUpdated event when setting a score", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      expect(passportId).to.equal(1);

      const tx = await passportBuilderScore.setScore(passportId, 100);

      // Wait for the transaction receipt to access the event logs
      const receipt = await tx.wait();

      if (!receipt.events) {
        throw new Error("No events found in the receipt");
      }

      // Access the event logs for the "ScoreUpdated" event
      const event = receipt.events.find((e) => e.event === "ScoreUpdated");

      if (!event || !event.args || event.args.length < 3) {
        throw new Error("ScoreUpdated event not found in the receipt");
      }

      expect(event.args[0]).to.equal(passportId); // passportId
      expect(event.args[1]).to.equal(100); // score
    });

    it("Should not allow non-owner to set a score", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await expect(passportBuilderScore.connect(user1).setScore(passportId, 100)).to.be.revertedWith(
        "Caller is not a trusted signer"
      );
    });

    it("Should revert if setting a score for a non-existent passport ID", async () => {
      await expect(passportBuilderScore.setScore(9999, 100)).to.be.revertedWith("Passport ID does not exist");
    });

    it("Should return 0 for a passport ID with no score set", async () => {
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      expect(passportId).to.equal(1);

      const score = await passportBuilderScore.getScore(passportId);
      expect(score).to.equal(0);
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
      await passportBuilderScore.setPassportRegistry(newPassportRegistry.address);
      expect(await passportBuilderScore.passportRegistry()).to.equal(newPassportRegistry.address);
    });

    it("Should emit PassportRegistryChanged event when changing the address", async () => {
      await expect(passportBuilderScore.setPassportRegistry(newPassportRegistry.address))
        .to.emit(passportBuilderScore, "PassportRegistryChanged")
        .withArgs(passportRegistry.address, newPassportRegistry.address);
    });

    it("Should not allow non-owner to change the PassportRegistry address", async () => {
      await expect(
        passportBuilderScore.connect(user1).setPassportRegistry(newPassportRegistry.address)
      ).to.be.revertedWith(`OwnableUnauthorizedAccount("${user1.address}")`);
    });

    it("Should revert if the new address is the zero address", async () => {
      await expect(passportBuilderScore.setPassportRegistry(ethers.constants.AddressZero)).to.be.revertedWith(
        "Invalid address"
      );
    });
  });
});
