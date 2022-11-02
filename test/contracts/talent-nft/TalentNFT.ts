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
      expect(await talentNFTCollection.isWhitelisted(addressOne.address)).to.be.false;
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      expect(await talentNFTCollection.isWhitelisted(addressOne.address)).to.be.true;
    });

    it("validates invalid account whitelist attempt", async () => {
      expect(talentNFTCollection.whitelistAddress(addressOne.address, 1)).to.be.revertedWith("The tier given needs to be greater than TIERS.PUBLIC_STAGE");
      expect(talentNFTCollection.whitelistAddress(addressOne.address, 2)).not.to.be.reverted;
    });

    it("validates creation of minting token", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      const action = talentNFTCollection.createMintingToken(addressOne.address, "THISISMYTOKEN");
      await expect(action).not.to.be.reverted;
      const token = await action;
      expect(typeof token.data).to.eq("string");
      expect(token.data.length).to.be.greaterThan(10); 
    });

    it("validates creation of minting token (error scenario)", async () => {
      const action = talentNFTCollection.createMintingToken(addressOne.address, "THISISMYTOKEN");
      await expect(action).to.be.revertedWith("Public stage is not available and the address is not whitelisted");
    });

    it("validates minting {publicStage: false, whitelistedUser: false}", async () => {
      const action = talentNFTCollection.connect(addressOne).mint("1-1.png");
      await expect(action).to.be.revertedWith("Minting not allowed with current sender roles");
      expect(await talentNFTCollection.totalSupply()).to.eq(0);
    });

    it("validates minting {publicStage: true, whitelistedUser: false}", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      const action = talentNFTCollection.connect(addressOne).mint("1-1.png");
      await expect(action).not.to.be.reverted;
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates minting {publicStage: false, whitelistedUser: true}", async () => {
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      const action = talentNFTCollection.connect(addressOne).mint("1-1.png");
      await expect(action).not.to.be.reverted;
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates minting {publicStage: true, whitelistedUser: true}", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      const action = talentNFTCollection.connect(addressOne).mint("1-1.png");
      await expect(action).not.to.be.reverted;
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates minting duplicated minting prevention", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      await expect(talentNFTCollection.connect(addressOne).mint("1-1.png")).not.to.be.reverted;
      await expect(talentNFTCollection.connect(addressTwo).mint("1-1.png")).to.be.revertedWith("This combination was already minted");
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates if the minting combination is still available", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      expect(await talentNFTCollection.isCombinationaAvailable("1-1.png")).to.be.true;
      await expect(talentNFTCollection.connect(addressOne).mint("1-1.png")).not.to.be.reverted;
      expect(await talentNFTCollection.isCombinationaAvailable("1-1.png")).to.be.false;
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates that user can only mint one token", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      await expect(talentNFTCollection.connect(addressOne).mint("1-1.png")).not.to.be.reverted;
      await expect(talentNFTCollection.connect(addressOne).mint("1-1.png")).to.be.revertedWith("Address has already minted one Talent NFT");
      expect(await talentNFTCollection.totalSupply()).to.eq(1);
    });

    it("validates uri change", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      await talentNFTCollection.mint("1-1.png");
      expect(await talentNFTCollection.ownerOf(1)).to.eq(creator.address);
      await talentNFTCollection.setBaseURI("---");
      const token1 = "THISISMYTOKEN";
      await talentNFTCollection.createMintingToken(addressOne.address, token1);
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "123", token1, addressOne.address)).not.to.be.reverted;
      expect(await talentNFTCollection.tokenURI(1)).to.eq("123");
      const token2 = "THISISMYTOKEN2";
      await talentNFTCollection.createMintingToken(addressOne.address, token2);
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "321", token2, addressOne.address)).to.be.revertedWith("Metadata was already defined for this token");
    });

    it("validates uri change invalid calls", async () => {
      await talentNFTCollection.setPublicStageFlag(true);
      await talentNFTCollection.whitelistAddress(addressOne.address, 2);
      await talentNFTCollection.mint("1-1.png");
      expect(await talentNFTCollection.ownerOf(1)).to.eq(creator.address);
      await expect(talentNFTCollection.setTokenURI(9999, "123", "THISISMYTOKEN", addressOne.address)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");
      await expect(talentNFTCollection.tokenURI(1)).to.be.revertedWith("Base URI not set");
      const token1 = "THISISMYTOKEN";
      const token2 = "THISISMYTOKEN2";
      await talentNFTCollection.createMintingToken(addressOne.address, token1);
      await expect(talentNFTCollection.connect(creator).setTokenURI(1, "321", token2, addressOne.address)).to.be.revertedWith("Unable to ensure minter identity");
    });

    it("validates if nft is non-transferable", async () => {
      await talentNFTCollection.connect(creator).setBaseURI("TalentNFT");
      await talentNFTCollection.whitelistAddress(creator.address, 2);
      await talentNFTCollection.mint("1-1.png");
      expect(await talentNFTCollection.ownerOf(1)).to.eq(creator.address);
      const action = talentNFTCollection.transferFrom(creator.address, addressOne.address, 1);
      await expect(action).to.be.revertedWith("Talent NFT is non-transferable");
    });

  });
});