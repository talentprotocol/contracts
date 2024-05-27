import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  TalentProtocolToken,
  TalentRewardClaim,
  PassportRegistry,
  PassportBuilderScore,
} from "../../../typechain-types";
import { Artifacts } from "../../shared";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentRewardClaim", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let talentToken: TalentProtocolToken;
  let passportRegistry: PassportRegistry;
  let passportBuilderScore: PassportBuilderScore;
  let talentRewardClaim: TalentRewardClaim;

  beforeEach(async () => {
    [admin, user1, user2, user3] = await ethers.getSigners();

    console.log("Admin address:", admin.address);

    talentToken = (await deployContract(admin, Artifacts.TalentProtocolToken, [admin.address])) as TalentProtocolToken;
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportBuilderScore = (await deployContract(admin, Artifacts.PassportBuilderScore, [
      passportRegistry.address,
      admin.address,
    ])) as PassportBuilderScore;
    talentRewardClaim = (await deployContract(admin, Artifacts.TalentRewardClaim, [
      talentToken.address,
      passportBuilderScore.address,
      admin.address,
      admin.address,
    ])) as TalentRewardClaim;

    // Approve TalentRewardClaim contract to spend tokens on behalf of the admin
    const totalAllowance = ethers.utils.parseUnits("1000000000", 18);
    await talentToken.approve(talentRewardClaim.address, totalAllowance);
    await talentToken.unpause();
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await talentRewardClaim.owner()).to.equal(admin.address);
    });

    it("Should initialize users correctly", async () => {
      const users = [user1.address, user2.address];
      const amounts = [ethers.utils.parseUnits("10000", 18), ethers.utils.parseUnits("20000", 18)];

      await talentRewardClaim.initializeUsers(users, amounts);

      expect(await talentRewardClaim.tokensOwed(user1.address)).to.equal(ethers.utils.parseUnits("10000", 18));
      expect(await talentRewardClaim.tokensOwed(user2.address)).to.equal(ethers.utils.parseUnits("20000", 18));
    });
  });

  describe("Setup and Start Time", () => {
    it("Should set the start time correctly", async () => {
      const startTime = Math.floor(Date.now() / 1000);
      await talentRewardClaim.setStartTime(startTime);
      expect(await talentRewardClaim.startTime()).to.equal(startTime);
    });

    it("Should emit StartTimeSet event", async () => {
      const startTime = Math.floor(Date.now() / 1000);
      await expect(talentRewardClaim.setStartTime(startTime))
        .to.emit(talentRewardClaim, "StartTimeSet")
        .withArgs(startTime);
    });

    it("Should not allow claims before start time is set", async () => {
      const users = [user1.address];
      const amounts = [ethers.utils.parseUnits("10000", 18)];

      await talentRewardClaim.initializeUsers(users, amounts);
      await talentRewardClaim.finalizeSetup();

      await expect(talentRewardClaim.connect(user1).claimTokens()).to.be.revertedWith("Start time not set");
    });
  });

  describe("Claiming Tokens", () => {
    beforeEach(async () => {
      const users = [user1.address, user2.address];
      const amounts = [ethers.utils.parseUnits("10000", 18), ethers.utils.parseUnits("20000", 18)];

      await talentRewardClaim.initializeUsers(users, amounts);
      await talentRewardClaim.finalizeSetup();

      const startTime = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // Set start time to 1 week ago
      await talentRewardClaim.setStartTime(startTime);
    });

    it("Should allow users to claim tokens weekly", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 10); // Set builder score below 40
      const startTime = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // Set start time to 1 week ago
      await talentRewardClaim.setStartTime(startTime);

      await talentRewardClaim.connect(user1).claimTokens();
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("2000", 18));
    });

    it("Should allow users with a builder score above 40 to claim 5x tokens", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 50); // Set builder score above 40

      const startTime = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // Set start time to 1 week ago
      await talentRewardClaim.setStartTime(startTime);

      await talentRewardClaim.connect(user1).claimTokens();
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("10000", 18)); // 5x the weekly amount
    });

    it("Should burn tokens if a user misses a claim", async () => {
      const initialBalance = await talentToken.balanceOf(admin.address);

      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 10); // Set builder score below 40

      const startTime = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60; // Set start time to 2 weeks ago
      await talentRewardClaim.setStartTime(startTime);

      await talentRewardClaim.connect(user1).claimTokens();
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("2000", 18));
      expect(await talentToken.totalSupply()).to.equal(initialBalance.sub(ethers.utils.parseUnits("2000", 18)));
    });
  });

  describe("Claiming & burning Tokens", () => {
    beforeEach(async () => {
      const users = [user1.address, user2.address];
      const amounts = [ethers.utils.parseUnits("3000", 18), ethers.utils.parseUnits("20000", 18)];

      await talentRewardClaim.initializeUsers(users, amounts);
      await talentRewardClaim.finalizeSetup();

      const startTime = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60; // Set start time to 1 week ago
      await talentRewardClaim.setStartTime(startTime);
    });

    it("Should burn more than the amounts transfered", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 10); // Set builder score below 40
      const initialBalance = await talentToken.totalSupply();

      await talentRewardClaim.connect(user1).claimTokens();
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("1000", 18)); // 1k was transfered
      expect(await talentToken.totalSupply()).to.equal(initialBalance.sub(ethers.utils.parseUnits("2000", 18))); // 2k was burned
    });
  });

  describe("Unlocking all tokens", () => {
    beforeEach(async () => {
      const users = [user2.address];
      const amounts = [ethers.utils.parseUnits("216000", 18)];

      await talentRewardClaim.initializeUsers(users, amounts);
      await talentRewardClaim.finalizeSetup();
    });

    it("Should unlock all tokens if 104 weeks have passed", async () => {
      const startTime = Math.floor(Date.now() / 1000) - 104 * 7 * 24 * 60 * 60; // Set start time to 104 weeks ago
      await talentRewardClaim.setStartTime(startTime);

      await talentRewardClaim.connect(user2).claimTokens();
      expect(await talentToken.balanceOf(user2.address)).to.equal(ethers.utils.parseUnits("8000", 18)); // 104 weeks means 192k will be burned and 8k will be transfered
    });
  });
});
