import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import { ERC165 } from "../shared";

import { TalentToken } from "../../typechain";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("TalentToken", () => {
  let owner: SignerWithAddress;
  let talent: SignerWithAddress;
  let minter: SignerWithAddress;
  let investor: SignerWithAddress;

  let TalentTokenFactory: ContractFactory;
  let coin: TalentToken;

  beforeEach(async () => {
    [owner, talent, minter, investor] = await ethers.getSigners();

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

  async function builder(): Promise<TalentToken> {
    return upgrades.deployProxy(TalentTokenFactory, [
      "FooBar",
      "FOO",
      parseUnits("123"),
      talent.address,
      minter.address,
    ]) as Promise<TalentToken>;
  }

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IERC20", "IAccessControl", "IERC1363"]);
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

    it("correctly sets mintingAvailability", async () => {
      expect(await coin.mintingAvailability()).to.equal((await coin.MAX_SUPPLY()).sub(await coin.totalSupply()));
    });

    describe("mint", () => {
      it("works when called by the minter", async () => {
        const action = coin.connect(minter).mint(investor.address, parseUnits("1"));

        await expect(action).not.to.be.reverted;
        expect(await coin.balanceOf(investor.address)).to.equal(parseUnits("1"));
      });

      it("updates mintingAvailability", async () => {
        const before = await coin.mintingAvailability();
        await coin.connect(minter).mint(investor.address, parseUnits("1"));
        const after = await coin.mintingAvailability();

        expect(after).to.equal(before.sub(parseUnits("1")));
      });

      it("does not update mintingFinishedAt if MAX_SUPPLY is not reached", async () => {
        await coin.connect(minter).mint(investor.address, (await coin.mintingAvailability()).div(2));

        expect(await coin.mintingFinishedAt()).to.equal(0);
      });

      it("updates mintingFinishedAt if MAX_SUPPLY is reached", async () => {
        await coin.connect(minter).mint(investor.address, await coin.mintingAvailability());

        expect(await coin.mintingAvailability()).to.equal(0);
        expect(await coin.mintingFinishedAt()).not.to.equal(0);
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

      it("updates mintingAvailability if MAX_SUPPLY has never been reached", async () => {
        await coin.connect(minter).mint(investor.address, parseUnits("1"));

        const before = await coin.mintingAvailability();
        await coin.connect(minter).burn(investor.address, parseUnits("1"));
        const after = await coin.mintingAvailability();

        expect(after).to.equal(before.add(parseUnits("1")));
      });

      it("does not update mintingAvailability if MAX_SUPPLY has been reached", async () => {
        // reach max supply
        await coin.connect(minter).mint(investor.address, await coin.mintingAvailability());

        const before = await coin.mintingAvailability();
        await coin.connect(minter).burn(investor.address, parseUnits("1"));
        const after = await coin.mintingAvailability();

        expect(after).to.equal(before);
      });
    });
  });
});
