import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import type { TalentFactory, TalentFactoryV2, TalentToken, TalentTokenV2 } from "../../typechain";
import {
  TalentToken__factory,
  TalentTokenV2__factory,
  TalentFactoryV2__factory,
  UpgradeableBeacon__factory,
} from "../../typechain";

import TalentTokenV2Artifact from "../../artifacts/contracts/test/TalentTokenV2.sol/TalentTokenV2.json";

import { ERC165, Artifacts } from "../shared";
import { findEvent } from "../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("TalentFactory", () => {
  let creator: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let factory: TalentFactory;

  let TalentFactoryFactory: ContractFactory;
  let naps: TalentToken;
  let TalentFactoryV2Factory: TalentFactoryV2__factory;
  let TalentTokenV2Factory: TalentTokenV2__factory;

  beforeEach(async () => {
    [creator, minter, talent1, talent2] = await ethers.getSigners();

    TalentFactoryFactory = await ethers.getContractFactory("TalentFactory");
  });

  describe("upgrades implementation beacon", () => {
    let naps: TalentToken;
    let TalentFactoryV2Factory: TalentFactoryV2__factory;
    let TalentTokenV2Factory: TalentTokenV2__factory;

    beforeEach(async () => {
      factory = (await upgrades.deployProxy(TalentFactoryFactory, [])) as TalentFactory;
      await factory.setMinter(minter.address);

      TalentFactoryV2Factory = await ethers.getContractFactory("TalentFactoryV2");
    });

    it("allows upgrading the factory itself", async () => {
      const factory2 = (await upgrades.upgradeProxy(factory, TalentFactoryV2Factory)) as TalentFactoryV2;

      expect(await factory2.isV2()).to.eq(true);
    });

    it("the factory upgrade allows to change the minter", async () => {
      expect(await factory.minter()).to.eq(minter.address);

      const factory2 = (await upgrades.upgradeProxy(factory, TalentFactoryV2Factory)) as TalentFactoryV2;
      await factory2.connect(creator).transferMinter(talent1.address);

      expect(await factory.minter()).to.eq(talent1.address);
    });
  });
});
