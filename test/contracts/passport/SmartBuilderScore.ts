import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SmartBuilderScore, PassportBuilderScore, PassportRegistry } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { findEvent } from "../../shared/utils";
import { parseEther } from "ethers/lib/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("PassportBuilderScore", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let feeCollector: SignerWithAddress;
  let sourceCollector: SignerWithAddress;

  let smartBuilderScore: SmartBuilderScore;
  let passportBuilderScore: PassportBuilderScore;
  let passportRegistry: PassportRegistry;

  beforeEach(async () => {
    [admin, user1, user2, feeCollector, sourceCollector] = await ethers.getSigners();
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportBuilderScore = (await deployContract(admin, Artifacts.PassportBuilderScore, [
      passportRegistry.address,
      admin.address,
    ])) as PassportBuilderScore;
    smartBuilderScore = (await deployContract(admin, Artifacts.SmartBuilderScore, [
      admin.address,
      passportBuilderScore.address,
      passportRegistry.address,
      feeCollector.address,
    ])) as SmartBuilderScore;

    await passportBuilderScore.connect(admin).addTrustedSigner(smartBuilderScore.address);
    await passportRegistry.connect(admin).setGenerationMode(true, 1); // Enable sequential mode
  });

  describe("Deployment", () => {
    it("allows setting a score onchain if the message came from the admin", async () => {
      const score = 100;
      await passportRegistry.connect(user1).create("source1");
      const passportID = await passportRegistry.passportId(user1.address);
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256"], [score, passportID]);
      // Sign the hash
      const signature = await admin.signMessage(ethers.utils.arrayify(numberHash));

      const tx = await smartBuilderScore
        .connect(user1)
        .addScore(score, passportID, signature, { value: parseEther("0.005") });

      const event = await findEvent(tx, "BuilderScoreSet");
      expect(event).to.exist;
      expect(event?.args?.score).to.eq(score);
      expect(event?.args?.passportId).to.eq(passportID);
      expect(event?.args?.user).to.eq(user1.address);

      const scoreOnchain = await passportBuilderScore.getScore(passportID);
      expect(scoreOnchain).to.eq(score);
    });

    it("fails if setting a score onchain for a message that didnt come from the admin", async () => {
      const score = 100;
      const passportID = 1;
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256"], [score, passportID]);
      // Sign the hash
      const signature = await user1.signMessage(ethers.utils.arrayify(numberHash));

      const action = smartBuilderScore.addScore(score, passportID, signature, { value: parseEther("0.005") });
      await expect(action).to.be.revertedWith("Invalid signature");
    });

    it("fails if the user didn't transfer enough ETH", async () => {
      const score = 100;
      const passportID = 1;
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256"], [score, passportID]);
      // Sign the hash
      const signature = await user1.signMessage(ethers.utils.arrayify(numberHash));

      const action = smartBuilderScore.addScore(score, passportID, signature, { value: parseEther("0.00001") });
      await expect(action).to.be.revertedWith("Insufficient payment");
    });

    it("changes the balance by the full amount if the source doesn't exist", async () => {
      const score = 100;
      await passportRegistry.connect(user1).create("source2");
      const passportID = await passportRegistry.passportId(user1.address);
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256"], [score, passportID]);
      // Sign the hash
      const signature = await admin.signMessage(ethers.utils.arrayify(numberHash));

      const balanceBefore = await feeCollector.getBalance();
      const balanceOfSourceBefore = await sourceCollector.getBalance();

      await smartBuilderScore.connect(user1).addScore(score, passportID, signature, { value: parseEther("0.005") });

      const balanceAfter = await feeCollector.getBalance();
      const balanceOfSourceAfter = await sourceCollector.getBalance();
      expect(balanceAfter.sub(balanceBefore)).to.eq(parseEther("0.005"));
      expect(balanceOfSourceAfter.sub(balanceOfSourceBefore)).to.eq(0);
    });
  });
});
