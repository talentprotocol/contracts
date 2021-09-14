import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import { TalentFactory } from "../../typechain/TalentFactory";
import TalentFactoryArtifact from "../../artifacts/contracts/TalentFactory.sol/TalentFactory.json";

import { TalentToken__factory } from "../../typechain/factories/TalentToken__factory";

import type { ContractReceipt, ContractTransaction, Event, ContractFactory } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

async function findEvent(tx: ContractTransaction, name: string): Promise<Event | undefined> {
  const receipt: ContractReceipt = await tx.wait();

  return receipt.events?.find((e) => e.event === "TalentCreated");
}

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
      const action = deployContract(creator, TalentFactoryArtifact, [minter.address]);

      await expect(action).not.to.be.reverted;
    });
  });

  describe("functions", () => {
    beforeEach(async () => {
      factory = (await deployContract(creator, TalentFactoryArtifact, [minter.address])) as TalentFactory;
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

      it("does not allow non minters", async () => {
        const action = factory.connect(talent1).createTalent(talent1.address, "Miguel Palhas", "NAPS");

        await expect(action).to.be.reverted;
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
  });
});
