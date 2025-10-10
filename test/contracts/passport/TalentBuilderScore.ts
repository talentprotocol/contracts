import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TalentBuilderScore, PassportBuilderScore, PassportRegistry } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { findEvent } from "../../shared/utils";
import { parseEther } from "ethers/lib/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentBuilderScore", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let feeCollector: SignerWithAddress;
  let sourceCollector: SignerWithAddress;

  const existingOnchainId = 1005;

  let talentBuilderScore: TalentBuilderScore;
  let passportBuilderScore: PassportBuilderScore;
  let passportRegistry: PassportRegistry;

  beforeEach(async () => {
    [admin, user1, user2, feeCollector, sourceCollector] = await ethers.getSigners();
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportBuilderScore = (await deployContract(admin, Artifacts.PassportBuilderScore, [
      passportRegistry.address,
      admin.address,
    ])) as PassportBuilderScore;
    talentBuilderScore = (await deployContract(admin, Artifacts.TalentBuilderScore, [
      admin.address,
      passportBuilderScore.address,
      passportRegistry.address,
      feeCollector.address,
    ])) as TalentBuilderScore;

    await passportRegistry.connect(admin).adminCreate("login.talentprotocol.com", user2.address, existingOnchainId)
    // await passportRegistry.connect(admin).setGenerationMode(true, 1); // Enable sequential mode
    await passportRegistry.connect(admin).transferOwnership(talentBuilderScore.address)

    await passportBuilderScore.connect(admin).addTrustedSigner(talentBuilderScore.address);
    
  });

  describe("Deployment", () => {
    it("allows changing the owner to a new address if called by the admin", async () => {
      await talentBuilderScore.connect(admin).setPassportRegistryOwner(user1.address);

      const newOwner = await passportRegistry.owner();
      expect(newOwner).to.eq(user1.address);
    });

    it("does not allow changing the owner to a new address if not called by the admin", async () => {
      const action = talentBuilderScore.connect(user1).setPassportRegistryOwner(user1.address);

      await expect(action).to.be.reverted;
    });

    it("allows setting a score onchain if the message came from the admin", async () => {
      const score = 100;
      const talentId = existingOnchainId;
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256", "address"], [score, talentId, user1.address]);
      // Sign the hash
      const signature = await admin.signMessage(ethers.utils.arrayify(numberHash));

      const tx = await talentBuilderScore
        .connect(user1)
        .addScore(score, talentId, user1.address, signature, { value: parseEther("0.005") });

      const event = await findEvent(tx, "BuilderScoreSet");
      expect(event).to.exist;
      expect(event?.args?.score).to.eq(score);
      expect(event?.args?.talentId).to.eq(talentId);
      expect(event?.args?.user).to.eq(user1.address);

      const scoreOnchain = await passportBuilderScore.getScore(talentId);
      expect(scoreOnchain).to.eq(score);
    });

    it("allows setting a score onchain if the talentId is not yet created", async () => {
      const score = 100;
      const talentId = 10103
      const wallet = user1.address;
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256", "address"], [score, talentId, wallet]);
      // Sign the hash
      const signature = await admin.signMessage(ethers.utils.arrayify(numberHash));

      const tx = await talentBuilderScore
        .connect(user1)
        .addScore(score, talentId, wallet, signature, { value: parseEther("0.005") });

      const event = await findEvent(tx, "BuilderScoreSet");
      expect(event).to.exist;
      expect(event?.args?.score).to.eq(score);
      expect(event?.args?.talentId).to.eq(talentId);
      expect(event?.args?.user).to.eq(user1.address);

      const talentIdRegistered = await passportRegistry.passportId(wallet)
      expect(talentIdRegistered).to.eq(talentId);

      const scoreOnchain = await passportBuilderScore.getScore(talentId);
      expect(scoreOnchain).to.eq(score);
    });

    it("fails if setting a score onchain for a message that didnt come from the admin", async () => {
      const score = 100;
      const talentId = 1;
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256", "address"], [score, talentId, user1.address]);
      // Sign the hash
      const signature = await user1.signMessage(ethers.utils.arrayify(numberHash));

      const action = talentBuilderScore.addScore(score, talentId, user1.address, signature, { value: parseEther("0.005") });
      await expect(action).to.be.revertedWith("Invalid signature");
    });

    it("fails if the user didn't transfer enough ETH", async () => {
      const score = 100;
      const talentId = 1;
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256", "address"], [score, talentId, user1.address]);
      // Sign the hash
      const signature = await user1.signMessage(ethers.utils.arrayify(numberHash));

      const action = talentBuilderScore.addScore(score, talentId, user1.address, signature, { value: parseEther("0.00001") });
      await expect(action).to.be.revertedWith("Insufficient payment");
    });

    it("changes the balance by the full amount if the source doesn't exist", async () => {
      const score = 100;
      const talentId = existingOnchainId;

      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256", "address"], [score, talentId, user1.address]);
      // Sign the hash
      const signature = await admin.signMessage(ethers.utils.arrayify(numberHash));

      const balanceBefore = await feeCollector.getBalance();
      const balanceOfSourceBefore = await sourceCollector.getBalance();

      await talentBuilderScore.connect(user1).addScore(score, talentId, user1.address, signature, { value: parseEther("0.005") });

      const balanceAfter = await feeCollector.getBalance();
      const balanceOfSourceAfter = await sourceCollector.getBalance();
      expect(balanceAfter.sub(balanceBefore)).to.eq(parseEther("0.005"));
      expect(balanceOfSourceAfter.sub(balanceOfSourceBefore)).to.eq(0);
    });
  });
});
