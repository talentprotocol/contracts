import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import { ERC165 } from "../shared";

import { TalentToken } from "../../typechain/TalentToken";
import TalentTokenArtifact from "../../artifacts/contracts/TalentToken.sol/TalentToken.json";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("TalentToken", () => {
  let creator: SignerWithAddress;
  let talent: SignerWithAddress;
  let minter: SignerWithAddress;
  let investor: SignerWithAddress;

  let TalentTokenFactory: ContractFactory;
  let coin: TalentToken;

  beforeEach(async () => {
    [creator, talent, minter, investor] = await ethers.getSigners();

    // deploy template
    TalentTokenFactory = await ethers.getContractFactory("TalentToken");
  });

  describe("initialize", () => {
    it("can be deployed as a proxy", async () => {
      const action = upgrades.deployProxy(TalentTokenFactory, [
        "FooBar",
        "FOO",
        parseUnits("1000"),
        talent.address,
        minter.address,
      ]);

      await expect(action).not.to.be.reverted;
    });
  });

  const builder = async () => {
    return upgrades.deployProxy(TalentTokenFactory, [
      "FooBar",
      "FOO",
      parseUnits("123"),
      talent.address,
      minter.address,
    ]) as Promise<TalentToken>;
  };

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["ERC165", "ERC20", "AccessControl"]);
  });

  describe("functions", () => {
    beforeEach(async () => {
      coin = await builder();
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

    describe("mint", () => {
      it("works when called by the minter", async () => {
        const action = coin.connect(minter).mint(investor.address, parseUnits("1"));

        await expect(action).not.to.be.reverted;
        expect(await coin.balanceOf(investor.address)).to.equal(parseUnits("1"));
      });

      it("is not callable by a non-minter", async () => {
        const action = coin.connect(investor).mint(investor.address, parseUnits("1"));

        await expect(action).to.be.reverted;
      });
    });
    describe("burn", () => {
      it("works when called by the minter", async () => {
        const action = coin.connect(minter).burn(talent.address, parseUnits("1"));

        await expect(action).not.to.be.reverted;
        expect(await coin.balanceOf(talent.address)).to.equal(parseUnits("122"));
      });

      it("is not callable by a non-minter", async () => {
        const action = coin.connect(talent).burn(talent.address, parseUnits("1"));

        await expect(action).to.be.reverted;
      });

      it("cannot burn tokens if owner doesn't have enough", async () => {
        const action = coin.connect(minter).burn(investor.address, parseUnits("1"));

        await expect(action).to.be.reverted;
      });
    });
  });
});
