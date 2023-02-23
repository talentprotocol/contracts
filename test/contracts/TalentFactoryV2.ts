import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import type { TalentFactory, TalentFactoryV2, TalentToken } from "../../typechain-types";
import {
  TalentTokenV2__factory,
  TalentFactoryV2__factory,
} from "../../typechain-types";

chai.use(solidity);

const { expect } = chai;

describe("TalentFactoryV2", () => {
  let creator: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let factory: TalentFactory;

  let TalentFactoryFactory: ContractFactory;

  beforeEach(async () => {
    [creator, minter, talent1, talent2] = await ethers.getSigners();

    TalentFactoryFactory = await ethers.getContractFactory("TalentFactory");
  });

  describe("upgrades implementation beacon", () => {
    let TalentFactoryV2Factory: TalentFactoryV2__factory;

    beforeEach(async () => {
      factory = (await upgrades.deployProxy(TalentFactoryFactory, [])) as TalentFactory;
      await factory.setMinter(minter.address);

      TalentFactoryV2Factory = (await ethers.getContractFactory("TalentFactoryV2")) as TalentFactoryV2__factory;
    });

    it("allows upgrading the factory itself", async () => {
      const factory2 = (await upgrades.upgradeProxy(factory, TalentFactoryV2Factory)) as TalentFactoryV2;

      expect(await factory2.version()).to.eq(2);
    });

    it("the factory upgrade allows to change the minter", async () => {
      expect(await factory.minter()).to.eq(minter.address);

      const factory2 = (await upgrades.upgradeProxy(factory, TalentFactoryV2Factory)) as TalentFactoryV2;
      await factory2.connect(creator).transferMinter(talent1.address);

      expect(await factory.minter()).to.eq(talent1.address);
    });
  });
});
