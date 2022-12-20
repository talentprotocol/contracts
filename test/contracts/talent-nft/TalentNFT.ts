import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TalentNFT } from "../../../typechain-types";
import { Artifacts } from "../../shared";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;


describe("TalentNFT", () => {
  let creator: SignerWithAddress;
  let addressOne: SignerWithAddress;
  let addressTwo: SignerWithAddress;

  let talentNFTCollection: TalentNFT;

  beforeEach(async () => {
    [creator, addressOne, addressTwo] = await ethers.getSigners();
  });

  it("validates if the contract can be deployed", async () => {
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

  describe("testing functions", () => {
    beforeEach(async () => {
      talentNFTCollection = await builder();
    });

    it("validates contract given name and symbol", async () => {
      expect(await talentNFTCollection.name()).to.eq("Talent Protocol NFT Collection");
      expect(await talentNFTCollection.symbol()).to.eq("TALENTNFTs");
    });

    it("validates if contract starts with an empty collection", async () => {
      expect(await talentNFTCollection.totalSupply()).to.eq(0);
      expect(await talentNFTCollection.balanceOf(creator.address)).to.eq(0);
    });

    it("validates access control", async () => {
      expect(talentNFTCollection.connect(addressOne.address).addOwner(addressTwo.address)).to.be.reverted;
    });

    it("validates public stage mutation", async () => {
      expect(await talentNFTCollection.getPublicStageFlag()).to.eq(false);
      await talentNFTCollection.setPublicStageFlag(true);
      expect(await talentNFTCollection.getPublicStageFlag()).to.eq(true);
      await talentNFTCollection.setPublicStageFlag(false);
      expect(await talentNFTCollection.getPublicStageFlag()).to.eq(false);
    });

    it("validates account whitelisting", async () => {
      expect(await talentNFTCollection.isWhitelisted(addressOne.address, "")).to.be.false;
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      expect(await talentNFTCollection.isWhitelisted(addressOne.address, "")).to.be.true;
    });

    it("validates invalid account whitelist attempt", async () => {
      expect(talentNFTCollection.whitelistAddress(addressOne.address, 1)).to.be.revertedWith("The tier given needs to be greater than TIERS.PUBLIC_STAGE");
      expect(talentNFTCollection.whitelistAddress(addressOne.address, 2)).not.to.be.reverted;
    });

    it("validates minting {publicStage: false, whitelistedUser: false}", async () => {
      const action = talentNFTCollection.connect(addressOne).mint("");
      await expect(action).to.be.revertedWith("Minting not allowed with current sender roles");
      expect(await talentNFTCollection.totalSupply()).to.eq(0);
    });

    it("validates minting {publicStage: true, whitelistedUser: false}", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      const action = talentNFTCollection.connect(addressOne).mint("");
      await expect(action).not.to.be.reverted;
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates minting {publicStage: false, whitelistedUser: true}", async () => {
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      const action = talentNFTCollection.connect(addressOne).mint("");
      await expect(action).not.to.be.reverted;
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates minting {publicStage: true, whitelistedUser: true}", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      const action = talentNFTCollection.connect(addressOne).mint("");
      await expect(action).not.to.be.reverted;
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates if the minting combination is still available", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      expect(await talentNFTCollection.isCombinationAvailable("1-1.png")).to.be.true;
      await expect(talentNFTCollection.connect(addressOne).mint("")).not.to.be.reverted;
      await talentNFTCollection.whitelistAddress(addressOne.address, 3);
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "321", "1-1.png", addressOne.address, 1)).not.to.be.reverted;
      expect(await talentNFTCollection.isCombinationAvailable("1-1.png")).to.be.false;
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates accountTier for setTokenURI", async () => {
      expect(await talentNFTCollection.isCombinationAvailable("1-1.png")).to.be.true;
      await talentNFTCollection.whitelistAddress(addressOne.address, 12);
      await expect(talentNFTCollection.connect(addressOne).mint("")).not.to.be.reverted;
      await talentNFTCollection.whitelistAddress(addressTwo.address, 12);
      await expect(talentNFTCollection.connect(addressTwo).mint("")).not.to.be.reverted;
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "321", "15-15.png", addressOne.address, 15)).not.to.be.reverted;
      expect(await talentNFTCollection.isCombinationAvailable("15-15.png")).to.be.false;
      await expect(talentNFTCollection.connect(creator).setTokenURI(2, "321", "15-15.png", addressTwo.address, 5)).to.be.reverted;
    });

    it("validates that user can only mint one token", async () => {
      await expect(talentNFTCollection.connect(addressOne).mint("")).to.be.revertedWith("Minting not allowed with current sender roles");
      await talentNFTCollection.setPublicStageFlag(true);
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      await expect(talentNFTCollection.connect(addressOne).mint("")).not.to.be.reverted;
      await expect(talentNFTCollection.connect(addressOne).mint("")).to.be.revertedWith("Address has already minted one Talent NFT");
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates uri change", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      await talentNFTCollection.whitelistAddress(addressOne.address, 3);
      await talentNFTCollection.mint("");
      expect(await talentNFTCollection.ownerOf(1)).to.eq(creator.address);
      await talentNFTCollection.setBaseURI("---");
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "123", "1-1.png", addressOne.address, 1)).not.to.be.reverted;
      expect(await talentNFTCollection.tokenURI(1)).to.eq("123");
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "321", "1-1.png", addressOne.address, 1)).to.be.revertedWith("Metadata was already defined for this token");
    });

    it("validates uri change invalid calls", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      await talentNFTCollection.whitelistAddress(addressOne.address, 4);
      await talentNFTCollection.whitelistAddress(addressTwo.address, 4);
      await talentNFTCollection.connect(addressOne).mint("");
      await talentNFTCollection.connect(addressTwo).mint("");
      expect(await talentNFTCollection.ownerOf(1)).to.eq(addressOne.address);
      expect(await talentNFTCollection.ownerOf(2)).to.eq(addressTwo.address);
      await expect(talentNFTCollection.setTokenURI(9999, "123", "1-1.png", addressOne.address, 1)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");
      await expect(talentNFTCollection.tokenURI(1)).to.be.revertedWith("Base URI not set");
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "321", "1-1.png", addressOne.address, 1)).not.to.be.reverted;
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "321", "1-1.png", addressOne.address, 1)).to.be.revertedWith("Metadata was already defined for this token");
      await expect(talentNFTCollection.connect(creator).setTokenURI(2, "321", "1-1.png", addressOne.address, 1)).to.be.revertedWith("This combination was already minted");
    });

    it("validates if the nft is transferable", async () => {
      await talentNFTCollection.connect(creator).setBaseURI("TalentNFT");
      await talentNFTCollection.whitelistAddress(creator.address, 2);
      await talentNFTCollection.mint("");
      expect(await talentNFTCollection.ownerOf(1)).to.eq(creator.address);
      const action = talentNFTCollection.transferFrom(creator.address, addressOne.address, 1);
      await expect(action).not.to.be.reverted;
    });

    it("validates if using a code allows a wallet to mint", async () => {
      await talentNFTCollection.connect(creator).setBaseURI("TalentNFT");
      await talentNFTCollection.whitelistCode("çqjweq", 2);
      await talentNFTCollection.mint("çqjweq");
      expect(await talentNFTCollection.ownerOf(1)).to.eq(creator.address);
    });

    it("validates that the same code can't be used twice", async () => {
      await talentNFTCollection.connect(creator).setBaseURI("TalentNFT");
      await talentNFTCollection.whitelistCode("çqjweq", 2);
      await talentNFTCollection.connect(creator).mint("çqjweq");
      expect(await talentNFTCollection.ownerOf(1)).to.eq(creator.address);
      const action = talentNFTCollection.connect(addressOne).mint("çqjweq");

      await expect(action).to.be.revertedWith("Minting not allowed with current sender roles");
    });

    it("validates that after setting an URI, an admin can reset it", async () => {
      await talentNFTCollection.connect(creator).setBaseURI("TalentNFT");
      await talentNFTCollection.whitelistCode("çqjweq", 2);
      await talentNFTCollection.connect(creator).mint("çqjweq");

      expect(await talentNFTCollection.ownerOf(1)).to.eq(creator.address);
      expect(await talentNFTCollection.tokenURI(1)).to.eq("TalentNFT");

      await talentNFTCollection.setTokenURI(1, "123", "1-1.png", creator.address, 1);
      expect(await talentNFTCollection.tokenURI(1)).to.eq("123");

      await talentNFTCollection.clearTokenURI(1);
      console.log(await talentNFTCollection.tokenURI(1));
      expect(await talentNFTCollection.tokenURI(1)).to.eq("TalentNFT");
    });

    it("validates accountTier for setTokenURI with codes", async () => {
      expect(await talentNFTCollection.isCombinationAvailable("1-1.png")).to.be.true;
      await talentNFTCollection.whitelistCode("çqjweq", 12);
      await expect(talentNFTCollection.connect(addressOne).mint("çqjweq")).not.to.be.reverted;
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "321", "15-15.png", addressOne.address, 15)).not.to.be.reverted;
    });

    it("validates that you can't check for codes", async () => {
      await talentNFTCollection.connect(creator).setBaseURI("TalentNFT");
      await talentNFTCollection.whitelistCode("çqjweq", 2);
      expect(talentNFTCollection.hasOwnProperty("codeWhitelist")).to.eq(false);
    });
  });
});