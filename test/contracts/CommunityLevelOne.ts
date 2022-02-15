import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import type { CommunityLevelOne } from "../../typechain";
import { Artifacts } from "../shared";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("CommunityLevelOne", () => {
  let creator: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let communityCollection: CommunityLevelOne;

  beforeEach(async () => {
    [creator, addr1, addr2] = await ethers.getSigners();
  });

  it("can be deployed", async () => {
    const action = deployContract(creator, Artifacts.CommunityLevelOne, []);

    await expect(action).not.to.be.reverted;
  });

  const builder = async () => {
    return deployContract(creator, Artifacts.CommunityLevelOne, [
      creator.address
    ]) as Promise<CommunityLevelOne>;
  };

  describe("functions", () => {
    beforeEach(async () => {
      communityCollection = await builder();
    });

    it("has the given name and symbol", async () => {
      expect(await communityCollection.name()).to.eq("Talent Protocol Community Level One");
      expect(await communityCollection.symbol()).to.eq("TALCLEVELONE");
    });

    it("starts with an empty collection", async () => {
      expect(await communityCollection.totalSupply()).to.eq(0);
      expect(await communityCollection.balanceOf(creator.address)).to.eq(0);
    });

    it("airdrops a token to each address", async () => {
      await communityCollection.connect(creator).airdrop([creator.address, addr1.address, addr2.address])

      // Verify everyone got a token
      expect(await communityCollection.ownerOf(1)).to.eq(creator.address);
      expect(await communityCollection.ownerOf(2)).to.eq(addr1.address);
      expect(await communityCollection.ownerOf(3)).to.eq(addr2.address);
    })
  });
});
