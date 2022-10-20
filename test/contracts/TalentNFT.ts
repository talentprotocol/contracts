import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TalentNFT } from "../../typechain-types";
import { Artifacts } from "../shared";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentNFT", () => {
  let creator: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let talentNFTCollection: TalentNFT;

  beforeEach(async () => {
    [creator, addr1, addr2] = await ethers.getSigners();
  });

  it("can be deployed", async () => {
    const action = deployContract(creator, Artifacts.TalentNFT, [
      creator.address,
      "TALENTNFTs"
    ]);

    await expect(action).not.to.be.reverted;
  });

  const builder = async () => {
    return deployContract(creator, Artifacts.TalentNFT, [
      creator.address,
      "TALENTNFTs"
    ]) as Promise<TalentNFT>;
  };

  describe("functions", () => {
    beforeEach(async () => {
      talentNFTCollection = await builder();
    });

    it("has the given name and symbol", async () => {
      expect(await talentNFTCollection.name()).to.eq("Talent Protocol NFT Collection");
      expect(await talentNFTCollection.symbol()).to.eq("TALENTNFTs");
    });

    it("starts with an empty collection", async () => {
      expect(await talentNFTCollection.totalSupply()).to.eq(0);
      expect(await talentNFTCollection.balanceOf(creator.address)).to.eq(0);
    });

    it("checks public stage", async () => {
      expect(await talentNFTCollection.getPublicStageFlag()).to.eq(false);
      await talentNFTCollection.setPublicStageFlag(true);
      expect(await talentNFTCollection.getPublicStageFlag()).to.eq(true);
      await talentNFTCollection.setPublicStageFlag(false);
      expect(await talentNFTCollection.getPublicStageFlag()).to.eq(false);
    });
  });
});
