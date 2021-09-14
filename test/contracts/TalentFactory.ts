import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import { TalentFactory } from "../../typechain/TalentFactory";
import TalentFactoryArtifact from "../../artifacts/contracts/TalentFactory.sol/TalentFactory.json";

import { TalentToken__factory } from "../../typechain/factories/TalentToken__factory";

import type { ContractReceipt, ContractTransaction, Event } from "ethers";
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
  let talent: SignerWithAddress;
  let minter: SignerWithAddress;
  let factory: TalentFactory;

  beforeEach(async () => {
    [creator, talent, minter] = await ethers.getSigners();
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
        const tx = await factory.connect(minter).createTalent(talent.address, "Miguel Palhas", "NAPS");

        const event = await findEvent(tx, "TalentCreated");

        expect(event).to.be;
        expect(event?.args?.talent).to.eq(talent.address);
      });

      it("mints new supply to the talent", async () => {
        const tx = await factory.connect(minter).createTalent(talent.address, "Miguel Palhas", "NAPS");

        const event = await findEvent(tx, "TalentCreated");

        const token = TalentToken__factory.connect(event?.args?.token, creator);
        expect(await token.balanceOf(talent.address)).to.eq(parseUnits("1000"));
      });

      it("does not allow non minters", async () => {
        const action = factory.connect(talent).createTalent(talent.address, "Miguel Palhas", "NAPS");

        await expect(action).to.be.reverted;
      });
    });
  });
});
