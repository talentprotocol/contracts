import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import type { ContractFactory } from "ethers";

import { TalentProtocol, TalentProtocolV2 } from "../../typechain-types";
import { ERC165, Artifacts } from "../shared";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("TalentProtocol", () => {
  let creator: SignerWithAddress;

  let tal: TalentProtocol;
  let TalentProtocolFactory: ContractFactory;
  let TalentProtocolFactoryV2: ContractFactory;

  beforeEach(async () => {
    [creator] = await ethers.getSigners();

    TalentProtocolFactory = await ethers.getContractFactory("TalentProtocol");
    TalentProtocolFactoryV2 = await ethers.getContractFactory("TalentProtocolV2");
  });

  it("can be deployed", async () => {
    const action = deployContract(creator, Artifacts.TalentProtocol, []);

    await expect(action).not.to.be.reverted;
  });

  const builder = async (): Promise<TalentProtocol> => {
    return upgrades.deployProxy(TalentProtocolFactory, [0]) as Promise<TalentProtocol>;
  };

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IERC20", "IERC1363"]);
  });

  describe("functions", () => {
    beforeEach(async () => {
      tal = await builder();
    });

    it("has the given name and symbol", async () => {
      expect(await tal.name()).to.eq("Talent Protocol");
      expect(await tal.symbol()).to.eq("TAL");
    });

    it("has the expected number of decimal places", async () => {
      expect(await tal.decimals()).to.eq(18);
    });

    it("does not mint any tokens", async () => {
      expect(await tal.totalSupply()).to.eq(0);
      expect(await tal.balanceOf(creator.address)).to.eq(0);
    });
  });

  describe("upgrading", () => {
    beforeEach(async () => {
      tal = await builder();
    });

    it("allows TAL to be upgraded", async () => {
      const talv2 = (await upgrades.upgradeProxy(tal, TalentProtocolFactoryV2)) as TalentProtocolV2;

      expect(await talv2.isV2()).to.eq(true);

      await talv2.connect(creator).adminMint(parseUnits("100"));

      expect(await talv2.balanceOf(creator.address)).to.eq(parseUnits("100"));
    });
  });
});
