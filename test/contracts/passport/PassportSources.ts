import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PassportSources } from "../../../typechain-types";
import { Artifacts } from "../../shared";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("PassportBuilderScore", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;

  let passportSources: PassportSources;

  beforeEach(async () => {
    [admin, user1] = await ethers.getSigners();
    passportSources = (await deployContract(admin, Artifacts.PassportSources, [admin.address])) as PassportSources;
  });

  describe("Deployment", () => {
    it("allows adding a new source mapping for an admin", async () => {
      await passportSources.connect(admin).addSource("source1", admin.address);
      const source = await passportSources.sources("source1");
      expect(source).to.equal(admin.address);
    });

    it("does not allow adding a new source mapping for a non-admin", async () => {
      await expect(passportSources.connect(user1).addSource("source1", user1.address)).to.be.revertedWith(
        `OwnableUnauthorizedAccount("${user1.address}")`
      );
    });
  });
});
