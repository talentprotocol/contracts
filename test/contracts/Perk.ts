import chai from "chai";
import dayjs from "dayjs";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import { ERC165 } from "../shared";

import { Perk, PerkV2, TalentToken } from "../../typechain";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;

describe("Perk", () => {
  let creator: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let supporter1: SignerWithAddress;
  let supporter2: SignerWithAddress;

  let PerkFactory: ContractFactory;
  let perk: Perk;

  let TalentTokenFactory: ContractFactory;
  let token: TalentToken;

  beforeEach(async () => {
    [creator, minter, talent1, talent2, supporter1, supporter2] = await ethers.getSigners();

    // deploy templates
    PerkFactory = await ethers.getContractFactory("Perk");
    TalentTokenFactory = await ethers.getContractFactory("TalentToken");
  });

  describe("initialize", () => {
    it("can be deployed as a proxy", async () => {
      const action = upgrades.deployProxy(PerkFactory, [
        "The perk title",
        "TICKER",
        1000,
        false,
        talent1.address,
        parseUnits("10"),
        creator.address,
      ]);
      await expect(action).not.to.be.reverted;
    });
  });

  async function builder(): Promise<Perk> {
    return upgrades.deployProxy(PerkFactory, [
      "The perk title",
      "TICKER",
      1000,
      false,
      talent1.address,
      parseUnits("10"),
      creator.address,
    ]) as Promise<Perk>;
  }

  async function tokenBuilder(): Promise<TalentToken> {
    return upgrades.deployProxy(TalentTokenFactory, [
      "FooBar",
      "FOO",
      parseUnits("123"),
      talent1.address,
      minter.address,
      creator.address,
    ]) as Promise<TalentToken>;
  }

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IAccessControl"]);
  });

  describe("functions", () => {
    beforeEach(async () => {
      perk = await builder();
      token = await tokenBuilder();
    });

    it("has the given name and symbol", async () => {
      expect(await perk.name()).to.eq("The perk title");
      expect(await perk.symbol()).to.eq("TICKER");
    });

    it("allows an Admin to change the talent token", async () => {
      await perk.connect(creator).setTalentToken(token.address);

      expect(await perk.talentToken()).to.eq(token.address);
    });

    it("correctly sets the max supply", async () => {
      expect(await perk.maxSupply()).to.equal(1000);
    });

    it("correctly sets the cost", async () => {
      expect(await perk.cost()).to.equal(parseUnits("10"));
    });

    it("correctly sets the DEFAULT_ADMIN role", async () => {
      expect(await perk.hasRole(await perk.DEFAULT_ADMIN_ROLE(), creator.address)).to.be.true;
    });

    it("correctly sets the TALENT role", async () => {
      expect(await perk.hasRole(await perk.ROLE_TALENT(), talent1.address)).to.be.true;
    });

    it("correctly sets the lock in period", async () => {
      const period = (await perk.lockInPeriod()).toNumber();
      const now = dayjs();
      const future = dayjs().add(period, "seconds");
      expect(future.diff(now, "days")).to.eq(30)
    });

    it("allows an admin to change the lock in period", async () => {
      await perk.connect(creator).changeLockInPeriod(86400) // 1 day in seconds

      const period = (await perk.lockInPeriod()).toNumber();
      const now = dayjs();
      const future = dayjs().add(period, "seconds");
      expect(future.diff(now, "days")).to.eq(1)
    });

    it("does not allow another wallet to change the lock in period", async () => {
      const action = perk.connect(talent1).changeLockInPeriod(86400) // 1 day in seconds
      await expect(action).to.be.reverted;
    });

    describe("mint", () => {
      it("allows a holder of talent tokens to mint a perk", async () => {
        // transfer enough tokens to the supporter
        await token.connect(minter).mint(supporter1.address, parseUnits("20"));
        await perk.connect(creator).setTalentToken(token.address);
        await token.connect(supporter1).approve(perk.address, parseUnits("10"));

        await perk.connect(supporter1).mint(supporter1.address);

        // confirm supporter has a token
        expect(await perk.balanceOf(supporter1.address)).to.equal(1);
        // confirm that the total supply changed
        expect(await perk.totalSupply()).to.eq(1);
        expect(await token.balanceOf(supporter1.address)).to.equal(parseUnits("10"));
        expect(await token.balanceOf(perk.address)).to.eq(parseUnits("10"));
      });


      it("does not allow a holder of talent tokens to mint the same perk twice", async () => {
          // transfer enough tokens to the supporter
          await token.connect(minter).mint(supporter1.address, parseUnits("30"));
          await perk.connect(creator).setTalentToken(token.address);
          await token.connect(supporter1).approve(perk.address, parseUnits("20"));

          await perk.connect(supporter1).mint(supporter1.address);
          const action = perk.connect(supporter1).mint(supporter1.address);

          await expect(action).to.be.revertedWith("sender already owns one of these perks");
      });

      it("does not allow to mint over the max supply", async () => {
        // transfer enough tokens to the supporter
        await token.connect(minter).mint(supporter1.address, parseUnits("30"));
        await perk.connect(creator).setTalentToken(token.address);
        await token.connect(supporter1).approve(perk.address, parseUnits("20"));

        await perk.connect(supporter1).mint(supporter1.address);
        const action = perk.connect(supporter1).mint(supporter1.address);

        await expect(action).to.be.revertedWith("sender already owns one of these perks");
      });
    });

    
    describe("claim", () => {
      it("does not allow to claim the locked tokens before the lock in period has passed", async () => {
        // transfer enough tokens to the supporter
        await token.connect(minter).mint(supporter1.address, parseUnits("20"));
        await perk.connect(creator).setTalentToken(token.address);
        await token.connect(supporter1).approve(perk.address, parseUnits("10"));

        await perk.connect(supporter1).mint(supporter1.address);

        const action = perk.claimLockedTokens(supporter1.address, 1);

        expect(action).to.be.revertedWith("The lock in period hasn't finished yet");
      });

      it("does not allow to a different user to claim the locked tokens", async () => {
        // transfer enough tokens to the supporter
        await token.connect(minter).mint(supporter1.address, parseUnits("20"));
        await perk.connect(creator).setTalentToken(token.address);
        await token.connect(supporter1).approve(perk.address, parseUnits("10"));
  
        await perk.connect(supporter1).mint(supporter1.address);

        const action = perk.claimLockedTokens(supporter2.address, 1);

        expect(action).to.be.revertedWith("sender is not the owner of the token");
      });

      it("allows the owner to claim the locked tokens after the lock in period has passed", async () => {
        // transfer enough tokens to the supporter
        await token.connect(minter).mint(supporter1.address, parseUnits("20"));
        await perk.connect(creator).setTalentToken(token.address);
        await token.connect(supporter1).approve(perk.address, parseUnits("10"));
  
        await perk.connect(supporter1).mint(supporter1.address);
  
        expect(await perk.ownerOf(1)).to.eq(supporter1.address);
  
        // move 100 days to the future
        await ethers.provider.send("evm_increaseTime", [8640000]);
  
        await perk.claimLockedTokens(supporter1.address, 1);
  
        expect(await token.balanceOf(supporter1.address)).to.eq(parseUnits("20"));
        expect(await token.balanceOf(token.address)).to.eq(0);
      });
  
      it("does not allow to claim multiple times the same token", async () => {
        // transfer enough tokens to the supporter
        await token.connect(minter).mint(supporter1.address, parseUnits("20"));
        await perk.connect(creator).setTalentToken(token.address);
        await token.connect(supporter1).approve(perk.address, parseUnits("10"));

        await perk.connect(supporter1).mint(supporter1.address);

        await ethers.provider.send("evm_increaseTime", [8640000]);

        await perk.claimLockedTokens(supporter1.address, 1);

        expect(await token.balanceOf(supporter1.address)).to.eq(parseUnits("20"));
        expect(await token.balanceOf(token.address)).to.eq(0);

        const action = perk.claimLockedTokens(supporter1.address, 1);
        expect(action).to.be.revertedWith("locked tockens have already been claimed on this token");
      });
    });
    
    describe("set perk as used", () => {
      it("allows a talent to set the perk as used", async () => {
        // transfer enough tokens to the supporter
        await token.connect(minter).mint(supporter1.address, parseUnits("20"));
        await perk.connect(creator).setTalentToken(token.address);
        await token.connect(supporter1).approve(perk.address, parseUnits("10"));

        await perk.connect(supporter1).mint(supporter1.address);

        await perk.connect(talent1).setTokenUsed(1);
        expect(await perk.isTokenUsed(1)).to.eq(true);
      });

      it("doesn't allow a non-talent to set the perk as used", async () => {
        // transfer enough tokens to the supporter
        await token.connect(minter).mint(supporter1.address, parseUnits("20"));
        await perk.connect(creator).setTalentToken(token.address);
        await token.connect(supporter1).approve(perk.address, parseUnits("10"));

        await perk.connect(supporter1).mint(supporter1.address);

        const action = perk.connect(supporter1).setTokenUsed(1);
        expect(action).to.be.revertedWith(
          `AccessControl: account ${supporter1.address.toLowerCase()} is missing role ${await perk.ROLE_TALENT()}`
        );
      });
    });
  });

  describe("upgradeability", () => {
    beforeEach(async () => {
      perk = await builder();
    });

    it("can be upgraded while keeping the state", async () => {
      const PerkV2Factory = await ethers.getContractFactory("PerkV2");

      const perk2 = (await upgrades.upgradeProxy(perk, PerkV2Factory)) as PerkV2;

      expect(await perk2.isV2()).to.be.true;
    });
  });
});
