import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SmartBuilderScore } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("PassportBuilderScore", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  let smartBuilderScore: SmartBuilderScore;

  beforeEach(async () => {
    [admin, user1, user2] = await ethers.getSigners();
    smartBuilderScore = (await deployContract(admin, Artifacts.SmartBuilderScore, [
      admin.address,
    ])) as SmartBuilderScore;
  });

  describe("Deployment", () => {
    it("allows setting a score onchain if the message came from the admin", async () => {
      const score = 100;
      const passportID = 1;
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256"], [score, passportID]);
      // Sign the hash
      const signature = await admin.signMessage(ethers.utils.arrayify(numberHash));

      const tx = await smartBuilderScore.connect(user1).createAttestation(score, passportID, signature);

      const event = await findEvent(tx, "AttestationCreated");
      expect(event).to.exist;
      expect(event?.args?.score).to.eq(score);
      expect(event?.args?.passportId).to.eq(passportID);
      expect(event?.args?.user).to.eq(user1.address);
    });

    it("fails if setting a score onchain for a message that didnt come from the admin", async () => {
      const score = 100;
      const passportID = 1;
      const numberHash = ethers.utils.solidityKeccak256(["uint256", "uint256"], [score, passportID]);
      // Sign the hash
      const signature = await user1.signMessage(ethers.utils.arrayify(numberHash));

      const action = smartBuilderScore.createAttestation(score, passportID, signature);
      await expect(action).to.be.revertedWith("Invalid signature");
    });
  });
});
