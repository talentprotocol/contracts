import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import type { TalentFactory, TalentFactoryV2, TalentToken, TalentTokenV2 } from "../../typechain-types";
import { TalentToken__factory, TalentTokenV2__factory, TalentFactoryV2__factory } from "../../typechain-types";

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
  let attacker: SignerWithAddress;
  let factory: TalentFactory;

  let TalentFactoryFactory: ContractFactory;

  beforeEach(async () => {
    [creator, minter, talent1, talent2, attacker] = await ethers.getSigners();

    TalentFactoryFactory = await ethers.getContractFactory("TalentFactory");
  });

  describe("constructor", () => {
    it("can be deployed", async () => {
      const action = deployContract(creator, Artifacts.TalentFactory, []);

      await expect(action).not.to.be.reverted;
    });
  });

  const builder = async (): Promise<TalentFactory> => {
    return upgrades.deployProxy(TalentFactoryFactory, []) as Promise<TalentFactory>;
    // return deployContract(creator, Artifacts.TalentFactory, []) as Promise<TalentFactory>;
  };

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IAccessControl"]);
  });

  describe("without minter set", () => {
    it("can't create talent tokens", async () => {
      factory = await builder();

      const action = factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");

      await expect(action).to.be.reverted;
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      factory = (await upgrades.deployProxy(TalentFactoryFactory, [])) as TalentFactory;

      await factory.setMinter(minter.address);
    });

    describe("createTalent", () => {
      it("deploys a new talent token", async () => {
        const tx = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");

        const event = await findEvent(tx, "TalentCreated");

        expect(event).to.be;
        expect(event?.args?.talent).to.eq(talent1.address);
      });

      it("sets the token admin to the proxy's own admin", async () => {
        const tx = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");
        const event = await findEvent(tx, "TalentCreated");
        const naps = TalentToken__factory.connect(event?.args?.token, creator);

        const factoryAdmin = await factory.getRoleMember(await factory.DEFAULT_ADMIN_ROLE(), 0);

        expect(await naps.hasRole(await naps.DEFAULT_ADMIN_ROLE(), factoryAdmin)).to.be.true;
      });

      it("mints new supply to the talent", async () => {
        const tx = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");

        const event = await findEvent(tx, "TalentCreated");

        const token = TalentToken__factory.connect(event?.args?.token, creator);
        expect(await token.balanceOf(talent1.address)).to.eq(parseUnits("2000"));
      });

      it("minter can deploy two independent talent tokens", async () => {
        const tx1 = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");
        const tx2 = await factory.connect(minter).createTalent(talent2.address, "Francisco Leal", "LEAL");

        const event1 = await findEvent(tx1, "TalentCreated");
        const event2 = await findEvent(tx2, "TalentCreated");

        expect(event1).to.be;
        expect(event2).to.be;

        const naps = TalentToken__factory.connect(event1?.args?.token, creator);
        const leal = TalentToken__factory.connect(event2?.args?.token, creator);

        expect(await naps.balanceOf(talent1.address)).to.eq(parseUnits("2000"));
        expect(await naps.balanceOf(talent2.address)).to.eq(parseUnits("0"));

        expect(await leal.balanceOf(talent1.address)).to.eq(parseUnits("0"));
        expect(await leal.balanceOf(talent2.address)).to.eq(parseUnits("2000"));
      });

      it("cannot create talent token for other talent", async () => {
        const action = factory.connect(attacker).createTalent(talent1.address, "Miguel Palhas", "NAPЅ");

        await expect(action).to.be.revertedWith("cannot create a talent token for another talent");
      });

      it("cannot create when talent already has talent token", async () => {
        // Rightful Creation
        const validToken = await factory
          .connect(talent1)
          .callStatic.createTalent(talent1.address, "Miguel Palhas", "NAPS");
        await factory.connect(talent1).createTalent(talent1.address, "Miguel Palhas", "NAPS");

        expect(validToken).to.equal(await factory.talentsToTokens(talent1.address));

        // Talent tries to create another talent
        const action = factory.connect(talent1).createTalent(talent1.address, "Miguel Palhas", "NAPЅ");

        await expect(action).to.be.revertedWith("talent already has talent token");
      });
    });

    describe("isTalentToken", () => {
      it("finds existing talent tokens", async () => {
        const tx = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");
        const event = await findEvent(tx, "TalentCreated");

        expect(await factory.isTalentToken(event?.args?.token)).to.be.true;
      });

      it("does not find non-talent tokens", async () => {
        expect(await factory.isTalentToken(talent1.address)).to.be.false;
      });
    });

    describe("isSymbol", () => {
      it("finds existing symbols", async () => {
        const tx = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");
        const event = await findEvent(tx, "TalentCreated");

        expect(await factory.isSymbol("NAPS")).to.be.true;
      });

      it("does not find non-existing symbols", async () => {
        expect(await factory.isSymbol("NAPS")).not.to.be.true;
      });
    });
  });
});
