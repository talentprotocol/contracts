import chai from "chai";
import { ethers, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import type {
  TalentFactoryV2,
  TalentFactoryV3,
  TalentTokenV3,
  TalentFactoryV3__factory,
} from "../../../typechain-types";
import { TalentTokenV3__factory } from "../../../typechain-types";
import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;

describe("TalentFactoryV3", () => {
  let creator: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let factoryV2: TalentFactoryV2;
  let factoryV3: TalentFactoryV3;
  let naps: TalentTokenV3;

  let TalentFactoryV2Factory: ContractFactory;
  let TalentFactoryV3Factory: TalentFactoryV3__factory;

  beforeEach(async () => {
    [creator, minter, talent1, talent2] = await ethers.getSigners();

    TalentFactoryV2Factory = await ethers.getContractFactory("TalentFactoryV2");
  });

  describe("upgrades implementation beacon", () => {
    beforeEach(async () => {
      factoryV2 = (await upgrades.deployProxy(TalentFactoryV2Factory, [])) as TalentFactoryV2;
      await factoryV2.setMinter(minter.address);

      TalentFactoryV3Factory = (await ethers.getContractFactory("TalentFactoryV3")) as TalentFactoryV3__factory;
    });

    it("allows upgrading the factoryV3 itself", async () => {
      factoryV3 = (await upgrades.upgradeProxy(factoryV2, TalentFactoryV3Factory)) as TalentFactoryV3;

      expect(await factoryV3.version()).to.eq(3);
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      factoryV2 = (await upgrades.deployProxy(TalentFactoryV2Factory, [])) as TalentFactoryV2;

      TalentFactoryV3Factory = (await ethers.getContractFactory("TalentFactoryV3")) as TalentFactoryV3__factory;
      factoryV3 = (await upgrades.deployProxy(TalentFactoryV3Factory, [])) as TalentFactoryV3;
      await factoryV3.setMinter(minter.address);
      await factoryV3.setWhitelister(minter.address);
      await factoryV3.connect(minter).whitelistAddress(talent1.address);

      const tx = await factoryV3.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");
      const event = await findEvent(tx, "TalentCreated");
      naps = TalentTokenV3__factory.connect(event?.args?.token, creator);
    });

    describe("createTalent", () => {
      it("creates a talent token with the factory address", async () => {
        expect(await naps.factory()).to.eq(factoryV3.address);
      });
    });

    describe("hasTalentToken", () => {
      it("returns true for an address that has a talent token", async () => {
        expect(await factoryV3.hasTalentToken(talent1.address)).to.be.true;
      });

      it("returns false for an address that does not have a talent token", async () => {
        expect(await factoryV3.hasTalentToken(talent2.address)).to.be.false;
      });
    });

    describe("setNewMappingValues", () => {
      it("is not callable by another talent", async () => {
        const result = factoryV3.connect(talent1).setNewMappingValues(talent1.address, talent2.address);

        await expect(result).to.be.revertedWith("not called by talent token");
      });

      it("is not callable directly by proposed talent", async () => {
        await naps.connect(talent1).proposeTalent(talent2.address);
        const result = factoryV3.connect(talent2).setNewMappingValues(talent1.address, talent2.address);

        await expect(result).to.be.revertedWith("not called by talent token");
      });

      it("changes mapping values when called by an admin", async () => {
        await factoryV3.connect(creator).setNewMappingValues(talent1.address, talent2.address);

        expect(await factoryV3.tokensToTalents(naps.address)).to.eq(talent2.address);
        expect(await factoryV3.talentsToTokens(talent1.address)).to.eq(ethers.constants.AddressZero);
        expect(await factoryV3.talentsToTokens(talent2.address)).to.eq(naps.address);
      });
    });
  });
});
