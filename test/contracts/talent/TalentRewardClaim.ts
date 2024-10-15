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
import { ensureTimestamp } from "../../shared/utils";

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
  let currentTimestamp: number = Math.floor(Date.now() / 1000);

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
    const totalAllowance = ethers.utils.parseUnits("600000000", 18);
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
      await talentRewardClaim.setStartTime(currentTimestamp);
      expect(await talentRewardClaim.startTime()).to.equal(currentTimestamp);
    });

    it("Should emit StartTimeSet event", async () => {
      await expect(talentRewardClaim.setStartTime(currentTimestamp))
        .to.emit(talentRewardClaim, "StartTimeSet")
        .withArgs(currentTimestamp);
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

      await talentRewardClaim.setStartTime(currentTimestamp);
    });

    it("Should allow users to claim tokens weekly", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 10); // Set builder score below 40

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("2000", 18));
    });

    it("Should allow users to claim tokens weekly in follow-up weeks", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 10); // Set builder score below 40

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("2000", 18));

      currentTimestamp = currentTimestamp + 2 * 24 * 60 * 60;
      await ensureTimestamp(currentTimestamp);

      const tx = talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      await expect(tx).to.be.revertedWith("Can only claim once per week");

      currentTimestamp = currentTimestamp + 10 * 24 * 60 * 60;
      await ensureTimestamp(currentTimestamp);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("4000", 18));

      currentTimestamp = currentTimestamp + 3 * 24 * 60 * 60;
      await ensureTimestamp(currentTimestamp);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("6000", 18));

      currentTimestamp = currentTimestamp + 7 * 24 * 60 * 60;
      await ensureTimestamp(currentTimestamp);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("8000", 18));

      currentTimestamp = currentTimestamp + 7 * 24 * 60 * 60;
      await ensureTimestamp(currentTimestamp);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("10000", 18));
    });

    it("Should allow users with a builder score above 40 to claim 5x tokens", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 50); // Set builder score above 40

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);
      console.log("proof1", proof1);
      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("10000", 18)); // 5x the weekly amount
    });

    it("Should burn tokens if a user misses a claim", async () => {
      const initialBalance = await talentToken.balanceOf(admin.address);

      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 10); // Set builder score below 40
      currentTimestamp = currentTimestamp + 8 * 24 * 60 * 60;
      await ensureTimestamp(currentTimestamp);

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("2000", 18));
      expect(await talentToken.totalSupply()).to.equal(initialBalance.sub(ethers.utils.parseUnits("2000", 18)));
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
      await talentRewardClaim.setStartTime(currentTimestamp);
    });

    it("Should burn more than the amounts transfered", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 10); // Set builder score below 40
      const initialBalance = await talentToken.totalSupply();

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("3000", 18)]);

      currentTimestamp = currentTimestamp + 13 * 24 * 60 * 60;
      await ensureTimestamp(currentTimestamp);

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
      await talentRewardClaim.setStartTime(currentTimestamp);
    });

    it("Should unlock all tokens if 104 weeks have passed", async () => {
      currentTimestamp = currentTimestamp + 104 * 7 * 24 * 60 * 60;
      await ensureTimestamp(currentTimestamp);

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("216000", 18)]);
      await talentRewardClaim.connect(user1).claimTokens(proof1, ethers.utils.parseUnits("216000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("8000", 18)); // 104 weeks means 208k will be burned and 8k will be transfered
    });
  });
});
