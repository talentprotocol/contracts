import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TalentProtocolToken, TalentTGEUnlock, PassportBuilderScore, PassportRegistry } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import generateMerkleTree from "../../../functions/generateMerkleTree";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { BigNumber } from "ethers";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentTGEUnlock", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let talentToken: TalentProtocolToken;
  let TalentTGEUnlock: TalentTGEUnlock;
  let passportRegistry: PassportRegistry;
  let passportBuilderScore: PassportBuilderScore;
  let merkleTree: StandardMerkleTree<(string | BigNumber)[]>;
  let totalTalentAmount: BigNumber;

  beforeEach(async () => {
    [admin, user1, user2, user3] = await ethers.getSigners();

    talentToken = (await deployContract(admin, Artifacts.TalentProtocolToken, [admin.address])) as TalentProtocolToken;
    merkleTree = generateMerkleTree({
      [user1.address]: ethers.utils.parseUnits("10000", 18),
      [user2.address]: ethers.utils.parseUnits("20000", 18),
    });
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportBuilderScore = (await deployContract(admin, Artifacts.PassportBuilderScore, [
      passportRegistry.address,
      admin.address,
    ])) as PassportBuilderScore;

    TalentTGEUnlock = (await deployContract(admin, Artifacts.TalentTGEUnlock, [
      talentToken.address,
      merkleTree.root,
      passportBuilderScore.address,
      40,
      admin.address,
    ])) as TalentTGEUnlock;

    // Approve TalentRewardClaim contract to spend tokens on behalf of the admin
    totalTalentAmount = ethers.utils.parseUnits("600000000", 18);
    await talentToken.connect(admin).transfer(TalentTGEUnlock.address, totalTalentAmount);
    await talentToken.unpause();
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await TalentTGEUnlock.owner()).to.equal(admin.address);
    });

    it("Should set the right minimum builder score", async () => {
      expect(await TalentTGEUnlock.minimumClaimBuilderScore()).to.equal(40);
    });
  });

  describe("Setup", () => {
    it("Should not allow claims before contract is enabled", async () => {
      const amount = ethers.utils.parseUnits("10000", 18);
      const proof = merkleTree.getProof([user1.address, amount]);

      await expect(TalentTGEUnlock.connect(user1).claim(proof, amount)).to.be.revertedWith("Contracts are disable");
    });

    it("Should allow claims after contract is enabled", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 40); // Set builder score 40

      const amount = ethers.utils.parseUnits("10000", 18);
      const proof = merkleTree.getProof([user1.address, amount]);

      const talentAmount = await talentToken.balanceOf(user1.address);
      expect(talentAmount).to.equal(0);
      await TalentTGEUnlock.connect(admin).enableContract();
      await TalentTGEUnlock.connect(user1).claim(proof, amount);
      expect(await talentToken.balanceOf(user1.address)).to.equal(amount);
    });
  });

  describe("Claiming Tokens", () => {
    beforeEach(async () => {
      const amounts = [ethers.utils.parseUnits("10000", 18), ethers.utils.parseUnits("20000", 18)];

      merkleTree = generateMerkleTree({
        [user1.address]: amounts[0],
        [user2.address]: amounts[1],
      });

      await TalentTGEUnlock.setMerkleRoot(merkleTree.root);
      await TalentTGEUnlock.connect(admin).enableContract();
    });

    it("Should allow users to claim tokens when the builder score is above the minimum", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 40); // Set builder score 40

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await TalentTGEUnlock.connect(user1).claim(proof1, ethers.utils.parseUnits("10000", 18));
      expect(await talentToken.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("10000", 18));
    });

    it("Should not allow users to claim tokens when the builder score is below the minimum", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 39); // Set builder score 39

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await expect(
        TalentTGEUnlock.connect(user1).claim(proof1, ethers.utils.parseUnits("100000", 18))
      ).to.be.revertedWith("Onchain Builder Score is too low");
    });

    it("Should not allow claiming more than the amount", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user1).create("source1");

      const passportId = await passportRegistry.passportId(user1.address);
      await passportBuilderScore.setScore(passportId, 41); // Set builder score 41

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await expect(
        TalentTGEUnlock.connect(user1).claim(proof1, ethers.utils.parseUnits("100000", 18))
      ).to.be.revertedWith("Invalid Allocation Proof");
    });

    it("Should not allow the wrong user to claim", async () => {
      await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
      await passportRegistry.connect(user2).create("source1");

      const passportId = await passportRegistry.passportId(user2.address);
      await passportBuilderScore.setScore(passportId, 41); // Set builder score 41

      const proof1 = merkleTree.getProof([user1.address, ethers.utils.parseUnits("10000", 18)]);

      await expect(
        TalentTGEUnlock.connect(user2).claim(proof1, ethers.utils.parseUnits("10000", 18))
      ).to.be.revertedWith("Invalid Allocation Proof");
    });
  });

  describe("disable and withdraw from contract", () => {
    it("Should not allow claims after contract is disabled", async () => {
      const amount = ethers.utils.parseUnits("10000", 18);
      const proof = merkleTree.getProof([user1.address, amount]);

      await TalentTGEUnlock.connect(admin).disableContract();
      await expect(TalentTGEUnlock.connect(user1).claim(proof, amount)).to.be.revertedWith("Contracts are disable");
    });

    it("Should allow owner to withdraw funds", async () => {
      await TalentTGEUnlock.connect(admin).disableContract();
      await TalentTGEUnlock.connect(admin).withdraw();
      expect(await talentToken.balanceOf(admin.address)).to.equal(totalTalentAmount);
    });

    it("Should not allow non-owner to withdraw funds", async () => {
      await expect(TalentTGEUnlock.connect(user1).withdraw()).to.be.revertedWith(
        `OwnableUnauthorizedAccount("${user1.address}")`
      );
    });
  });

  describe("update the minimum builder score to claim", () => {
    it("Should allow owner to set the minimum builder score", async () => {
      await TalentTGEUnlock.connect(admin).setMinimumBuilderScore(50);
      expect(await TalentTGEUnlock.minimumClaimBuilderScore()).to.equal(50);
    });

    it("Should not allow non-owner to withdraw funds", async () => {
      await expect(TalentTGEUnlock.connect(user1).setMinimumBuilderScore(100)).to.be.revertedWith(
        `OwnableUnauthorizedAccount("${user1.address}")`
      );
    });
  });
});
