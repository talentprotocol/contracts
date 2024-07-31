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
import generateMerkleTree from "../../../functions/generateMerkleTree";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { BigNumber } from "ethers";
import { zeroAddress } from "viem";

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
  let merkleTree: StandardMerkleTree<(string | BigNumber)[]>;

  beforeEach(async () => {
    [admin, user1, user2, user3] = await ethers.getSigners();

    talentToken = (await deployContract(admin, Artifacts.TalentProtocolToken, [admin.address])) as TalentProtocolToken;
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportBuilderScore = (await deployContract(admin, Artifacts.PassportBuilderScore, [
      passportRegistry.address,
      admin.address,
    ])) as PassportBuilderScore;

    merkleTree = generateMerkleTree({
      [user1.address]: ethers.utils.parseUnits("10000", 18),
      [user2.address]: ethers.utils.parseUnits("20000", 18),
    });

    talentRewardClaim = (await deployContract(admin, Artifacts.TalentRewardClaim, [
      talentToken.address,
      passportBuilderScore.address,
      admin.address,
      admin.address,
      merkleTree.root,
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
      const amount = ethers.utils.parseUnits("10000", 18);
      const merkleTree = generateMerkleTree({
        [user1.address]: amount,
      });

      await talentRewardClaim.setMerkleRoot(merkleTree.root);

      const proof1 = merkleTree.getProof([user1.address, amount]);

      await expect(talentRewardClaim.connect(user1).claimTokens(proof1, amount)).to.be.revertedWith(
        "Start time not set"
      );
    });
  });

  describe("Claiming Tokens", () => {
    beforeEach(async () => {
      const amounts = [ethers.utils.parseUnits("10000", 18), ethers.utils.parseUnits("20000", 18)];

      merkleTree = generateMerkleTree({
        [user1.address]: amounts[0],
        [user2.address]: amounts[1],
      });

      await talentRewardClaim.setMerkleRoot(merkleTree.root);

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

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("2000", 18));
    });

    it("Should allow users with a builder score above 40 to claim 5x tokens", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 50); // Set builder score above 40

      const startTime = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // Set start time to 1 week ago
      await talentRewardClaim.setStartTime(startTime);

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
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

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("2000", 18));
      expect(await talentToken.totalSupply()).to.equal(initialBalance.sub(ethers.utils.parseUnits("2000", 18)));
    });

    it("Shouldn't allow users to abuse the fact that the zero address can have a score to claim more tokens then they should", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 50); // Set builder score above 40
      await passportRegistry.connect(user1).transfer(zeroAddress);

      const startTime = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // Set start time to 1 week ago
      await talentRewardClaim.setStartTime(startTime);

      const proof1 = merkleTree.getProof([user2.address, ethers.utils.parseUnits("20000", 18)]);

      await talentRewardClaim.connect(user2).claimTokens(proof1, ethers.utils.parseUnits("20000", 18));
      expect(await talentToken.balanceOf(user2.address)).to.equal(ethers.utils.parseUnits("2000", 18)); // 1x the weekly amount
    });
  });

  describe("Claiming & burning Tokens", () => {
    beforeEach(async () => {
      const amounts = [ethers.utils.parseUnits("3000", 18), ethers.utils.parseUnits("20000", 18)];

      merkleTree = generateMerkleTree({
        [user1.address]: amounts[0],
        [user2.address]: amounts[1],
      });

      await talentRewardClaim.setMerkleRoot(merkleTree.root);

      const startTime = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60; // Set start time to 1 week ago
      await talentRewardClaim.setStartTime(startTime);
    });

    it("Should burn more than the amounts transfered", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 10); // Set builder score below 40
      const initialBalance = await talentToken.totalSupply();

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("3000", 18)]);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("3000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("1000", 18)); // 1k was transfered
      expect(await talentToken.totalSupply()).to.equal(initialBalance.sub(ethers.utils.parseUnits("2000", 18))); // 2k was burned
    });
  });

  describe("Unlocking all tokens", () => {
    beforeEach(async () => {
      const amounts = [ethers.utils.parseUnits("216000", 18)];

      merkleTree = generateMerkleTree({
        [user1.address]: amounts[0],
      });

      await talentRewardClaim.setMerkleRoot(merkleTree.root);
    });

    it("Should unlock all tokens if 104 weeks have passed", async () => {
      const startTime = Math.floor(Date.now() / 1000) - 104 * 7 * 24 * 60 * 60; // Set start time to 104 weeks ago
      await talentRewardClaim.setStartTime(startTime);

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("216000", 18)]);
      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("216000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("8000", 18)); // 104 weeks means 208k will be burned and 8k will be transfered
    });
  });
});
