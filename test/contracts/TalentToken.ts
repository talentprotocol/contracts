import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";
import { findEvent } from "../shared/utils";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import { ERC165 } from "../shared";

import { TalentToken, TalentTokenV2, TalentToken__factory } from "../../typechain-types";
import type { TalentFactoryV3 } from "../../typechain-types";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("TalentToken", () => {
  let admin: SignerWithAddress;
  let talent: SignerWithAddress;
  let minter: SignerWithAddress;
  let investor: SignerWithAddress;

  let TalentTokenFactory: ContractFactory;
  let TalentFactoryFactoryV3: ContractFactory;
  let coin: TalentToken;
  let naps: TalentToken;
  let factoryV3: TalentFactoryV3;

  beforeEach(async () => {
    [admin, talent, minter, investor] = await ethers.getSigners();

    // deploy template
    TalentTokenFactory = await ethers.getContractFactory("TalentToken");
  });

  describe("initialize", () => {
    it("can be deployed as a proxy", async () => {
      const action = upgrades.deployProxy(
        TalentTokenFactory,
        [
          "FooBar",
          "FOO",
          parseUnits("1000"),
          talent.address,
          minter.address,
          admin.address,
        ]
      );

      await expect(action).not.to.be.reverted;
    });
  });

  async function builder(): Promise<TalentToken> {
    return upgrades.deployProxy(
      TalentTokenFactory,
      [
        "FooBar",
        "FOO",
        parseUnits("123"),
        talent.address,
        minter.address,
        admin.address,
      ]
    ) as Promise<TalentToken>;
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

    it("correctly sets the talent' address", async () => {
      expect(await coin.talent()).to.equal(talent.address);
    });

    it("correctly sets the DEFAULT_ADMIN role", async () => {
      expect(await coin.hasRole(await coin.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
    });

    it("correctly sets the TALENT role", async () => {
      expect(await coin.hasRole(await coin.ROLE_TALENT(), talent.address)).to.be.true;
    });

    it("correctly sets the MINTER role", async () => {
      expect(await coin.hasRole(await coin.ROLE_MINTER(), minter.address)).to.be.true;
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

      it("cannot burn tokens if admin doesn't have enough", async () => {
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

    describe("proposeTalent", () => {
      it("is callable by the current talent wallet", async () => {
        const result = coin.connect(talent).proposeTalent(investor.address);

        await expect(result).not.to.be.reverted;
      });

      it("is not callable by another wallet", async () => {
        const coinRoleTalent = await coin.ROLE_TALENT();
        const result = coin.connect(admin).proposeTalent(investor.address);

        await expect(result).to.be.revertedWith(
          `AccessControl: account ${admin.address.toLowerCase()} is missing role ${coinRoleTalent}`
        );
      });

      it("stores proposedTalent with given address", async () => {
        await coin.connect(talent).proposeTalent(investor.address);

        expect(await coin.talent()).to.eq(talent.address);
        expect(await coin.proposedTalent()).to.eq(investor.address);
      });
    });

    describe("claimTalentOwnership", () => {
      beforeEach(async () => {
        TalentFactoryFactoryV3 = await ethers.getContractFactory("TalentFactoryV3");

        factoryV3 = (await upgrades.deployProxy(TalentFactoryFactoryV3, [])) as TalentFactoryV3;
  
        await factoryV3.setMinter(minter.address);
        await factoryV3.setWhitelister(minter.address);
  
        await factoryV3.connect(minter).whitelistAddress(talent.address);

        const tx = await factoryV3.connect(talent).createTalent(talent.address, "Miguel Palhas", "NAPS");
        const event = await findEvent(tx, "TalentCreated");

        naps = TalentToken__factory.connect(event?.args?.token, admin);
      });

      it("is callable by the proposed talent wallet", async () => {
        await naps.connect(talent).proposeTalent(investor.address);
        const result = naps.connect(investor).claimTalentOwnership();

        await expect(result).not.to.be.reverted;
      });

      it("is not callable by another wallet", async () => {
        const result = naps.connect(investor).claimTalentOwnership();

        await expect(result).to.be.revertedWith("talent is not proposed owner");
      });

      it("stores proposedTalent with given address", async () => {
        await naps.connect(talent).proposeTalent(investor.address);
        await naps.connect(investor).claimTalentOwnership();

        expect(await naps.talent()).to.eq(investor.address);
        expect(await naps.proposedTalent()).to.eq(ethers.constants.AddressZero);
      });

      it("gives ROLE_TALENT to the new wallet", async () => {
        await naps.connect(talent).proposeTalent(investor.address);
        await naps.connect(investor).claimTalentOwnership();

        expect(await naps.hasRole(await naps.ROLE_TALENT(), investor.address)).to.be.true;
      });

      it("revokes ROLE_TALENT from the old wallet", async () => {
        await naps.connect(talent).proposeTalent(investor.address);
        await naps.connect(investor).claimTalentOwnership();

        expect(await naps.hasRole(await naps.ROLE_TALENT(), talent.address)).to.be.false;
      });

      it("is callable by the proposed talent wallet", async () => {
        await naps.connect(talent).proposeTalent(investor.address);
        await naps.connect(investor).claimTalentOwnership();

        expect(await naps.hasRole(await naps.ROLE_TALENT(), investor.address)).to.be.true;
        expect(await naps.hasRole(await naps.ROLE_TALENT(), talent.address)).not.to.be.true;
        expect(await factoryV3.tokensToTalents(naps.address)).to.eq(investor.address);
        expect(await factoryV3.talentsToTokens(talent.address)).to.eq(ethers.constants.AddressZero);
        expect(await factoryV3.talentsToTokens(investor.address)).to.eq(naps.address);
      });
    });

    describe("setFactory", () => {
      it("is not callable by another wallet", async () => {
        const coinAdminRole = await coin.DEFAULT_ADMIN_ROLE();
        const result = coin.connect(talent).setFactory(factoryV3.address);

        await expect(result).to.be.revertedWith(
          `AccessControl: account ${talent.address.toLowerCase()} is missing role ${coinAdminRole}`
        );
      });

      it("is callable by an admin", async () => {
        const result = coin.connect(admin).setFactory(factoryV3.address);

        await expect(result).not.to.be.reverted;
      });

      it("stores factory with given address", async () => {
        await coin.connect(admin).setFactory(factoryV3.address);

        expect(await coin.factory()).to.eq(factoryV3.address);
      });
    });
  });

  describe("upgradeability", () => {
    beforeEach(async () => {
      coin = await builder();
    });

    it("can be upgraded while keeping the state", async () => {
      const TalentTokenV2Factory = await ethers.getContractFactory("TalentTokenV2");

      await coin.connect(talent).transfer(minter.address, 1);
      const coin2 = (await upgrades.upgradeProxy(coin, TalentTokenV2Factory)) as TalentTokenV2;

      expect(await coin2.version()).to.eq(2);
      expect(await coin2.balanceOf(minter.address)).to.eq(1);
    });
  });
});
