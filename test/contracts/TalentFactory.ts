import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import { TalentFactory } from "../../typechain/TalentFactory";
import TalentFactoryArtifact from "../../artifacts/contracts/TalentFactory.sol/TalentFactory.json";

import { TalentToken__factory } from "../../typechain/factories/TalentToken__factory";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ERC165 } from "../shared";
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

  beforeEach(async () => {
    [creator, minter, talent1, talent2] = await ethers.getSigners();
  });

  describe("constructor", () => {
    it("can be deployed", async () => {
      const action = deployContract(creator, TalentFactoryArtifact, []);

      await expect(action).not.to.be.reverted;
    });
  });

  const builder = async (): Promise<TalentFactory> => {
    return deployContract(creator, TalentFactoryArtifact, []) as Promise<TalentFactory>;
  };

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IAccessControl"]);
  });

  describe("without minter set", () => {
    it("can't create talent tokens", async () => {
      factory = await builder();

      const action = factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");

      expect(action).to.be.reverted;
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      factory = (await deployContract(creator, TalentFactoryArtifact, [])) as TalentFactory;

      await factory.setMinter(minter.address);
    });

    describe("createTalent", () => {
      it("deploys a new talent token", async () => {
        const tx = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");

        const event = await findEvent(tx, "TalentCreated");

        expect(event).to.be;
        expect(event?.args?.talent).to.eq(talent1.address);
      });

      it("mints new supply to the talent", async () => {
        const tx = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");

        const event = await findEvent(tx, "TalentCreated");

        const token = TalentToken__factory.connect(event?.args?.token, creator);
        expect(await token.balanceOf(talent1.address)).to.eq(parseUnits("1000"));
      });

      it("can deploy two independent talent tokens", async () => {
        const tx1 = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");
        const tx2 = await factory.connect(minter).createTalent(talent2.address, "Francisco Leal", "LEAL");

        const event1 = await findEvent(tx1, "TalentCreated");
        const event2 = await findEvent(tx2, "TalentCreated");

        expect(event1).to.be;
        expect(event2).to.be;

        const naps = TalentToken__factory.connect(event1?.args?.token, creator);
        const leal = TalentToken__factory.connect(event2?.args?.token, creator);

        expect(await naps.balanceOf(talent1.address)).to.eq(parseUnits("1000"));
        expect(await naps.balanceOf(talent2.address)).to.eq(parseUnits("0"));

        expect(await leal.balanceOf(talent1.address)).to.eq(parseUnits("0"));
        expect(await leal.balanceOf(talent2.address)).to.eq(parseUnits("1000"));
      });
    });

    describe("isTalent", () => {
      it("finds existing talents", async () => {
        await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");

        expect(await factory.isTalent(talent1.address)).to.be.true;
      });

      it("does not find non-talents", async () => {
        expect(await factory.isTalent(talent1.address)).to.be.false;
      });
    });

    describe("isTalentToken", () => {
      it("finds existing talent tokens", async () => {
        const tx = await factory.connect(minter).createTalent(talent1.address, "Miguel Palhas", "NAPS");
        const event = await findEvent(tx, "TalentCreated");

        expect(await factory.isTalentToken(event?.args?.token)).to.be.true;
      });

      it("does not find non-talent tokens", async () => {
        expect(await factory.isTalent(talent1.address)).to.be.false;
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
