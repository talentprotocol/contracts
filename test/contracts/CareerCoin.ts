import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import { CareerCoin } from "../../typechain/CareerCoin";
import CareerCoinArtifact from "../../artifacts/contracts/CareerCoin.sol/CareerCoin.json";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("CareerCoin", () => {
  let signers: any;
  let creator: any;
  let talent: any;

  let coin: CareerCoin;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    creator = signers[0];
    talent = signers[1];
  });

  it("can be deployed", async () => {
    const action = deployContract(creator, CareerCoinArtifact, [
      "FooBar",
      "FOO",
      parseUnits("1000"),
      talent.address,
    ]);

    await expect(action).not.to.be.reverted;
  });

  describe("functions", () => {
    beforeEach(async () => {
      coin = (await deployContract(creator, CareerCoinArtifact, [
        "FooBar",
        "FOO",
        parseUnits("123"),
        talent.address,
      ])) as CareerCoin;
    });

    it("has the given name and symbol", async () => {
      expect(await coin.name()).to.eq("FooBar");
      expect(await coin.symbol()).to.eq("FOO");
    });

    it("has the expected number of decimal places", async () => {
      expect(await coin.decimals()).to.eq(18);
    });

    it("mints the full supply to the creator", async () => {
      expect(await coin.totalSupply()).to.eq(parseUnits("123"));
      expect(await coin.balanceOf(talent.address)).to.eq(parseUnits("123"));
    });
  });
});
