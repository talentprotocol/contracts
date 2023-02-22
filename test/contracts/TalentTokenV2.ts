import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import type { TalentFactory, TalentToken } from "../../typechain-types";
import {
  TalentToken__factory,
  TalentTokenV2__factory,
  TalentFactoryV2__factory,
  UpgradeableBeacon__factory,
} from "../../typechain-types";

import TalentTokenV2Artifact from "../../artifacts/contracts/test/TalentTokenV2.sol/TalentTokenV2.json";

import { findEvent } from "../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("TalentFactoryV2", () => {
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

      const tx = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");
      const event = await findEvent(tx, "TalentCreated");
      naps = TalentToken__factory.connect(event?.args?.token, creator);
      naps.connect(talent1).transfer(creator.address, parseUnits("1"));

      naps.connect(talent1).transfer(creator.address, parseUnits("1.42"));
    });

    it("allows owner to beacon implementation", async () => {
      const talentTokenV2 = await deployContract(creator, TalentTokenV2Artifact, []);

      const beaconAddr = await factory.implementationBeacon();
      const beacon = UpgradeableBeacon__factory.connect(beaconAddr, creator);

      await beacon.upgradeTo(talentTokenV2.address);

      // naps is automatically upgraded
      const napsv2 = TalentTokenV2__factory.connect(naps.address, creator);
      expect(await napsv2.version()).to.eq(2);

      // state is kept
      // expect(napsv2.balanceOf(creator.address)).to.equal(parseUnits("1.42"));

      const tx = await factory.connect(minter).createTalent(talent2.address, "Francisco Leal", "LEAL");
      const event = await findEvent(tx, "TalentCreated");
      const leal = TalentTokenV2__factory.connect(event?.args?.token, creator);

      expect(await leal.version()).to.eq(2);
    });

    it("allows creator to change the minter", async () => {
      const talentTokenV2 = await deployContract(creator, TalentTokenV2Artifact, []);

      const beaconAddr = await factory.implementationBeacon();
      const beacon = UpgradeableBeacon__factory.connect(beaconAddr, creator);

      await beacon.upgradeTo(talentTokenV2.address);
      const napsv2 = TalentTokenV2__factory.connect(naps.address, creator);

      expect(await napsv2.hasRole(await naps.ROLE_MINTER(), minter.address)).to.eq(true);

      await napsv2.connect(creator).removeMinter(minter.address);
      await napsv2.connect(creator).addNewMinter(talent1.address);

      expect(await napsv2.hasRole(await naps.ROLE_MINTER(), minter.address)).to.eq(false);
      expect(await napsv2.hasRole(await naps.ROLE_MINTER(), talent1.address)).to.eq(true);
    });

    it("only allows the creator to remove the minter role", async () => {
      const talentTokenV2 = await deployContract(creator, TalentTokenV2Artifact, []);

      const beaconAddr = await factory.implementationBeacon();
      const beacon = UpgradeableBeacon__factory.connect(beaconAddr, creator);

      await beacon.upgradeTo(talentTokenV2.address);
      const napsv2 = TalentTokenV2__factory.connect(naps.address, creator);
      const defaultAdminRole = await napsv2.DEFAULT_ADMIN_ROLE();

      await expect(napsv2.connect(talent1).removeMinter(minter.address)).to.be.revertedWith(
        `AccessControl: account ${talent1.address.toLowerCase()} is missing role ${defaultAdminRole}`
      );

      await expect(napsv2.connect(creator).removeMinter(minter.address)).not.to.be.reverted;
    });
  });
});
