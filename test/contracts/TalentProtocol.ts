import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ERC165 } from "../shared";

import { TalentProtocol } from "../../typechain/TalentProtocol";
import TalentProtocolArtifact from "../../artifacts/contracts/TalentProtocol.sol/TalentProtocol.json";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("TalentProtocol", () => {
  let creator: SignerWithAddress;

  let tal: TalentProtocol;

  beforeEach(async () => {
    [creator] = await ethers.getSigners();
  });

  it("can be deployed", async () => {
    const action = deployContract(creator, TalentProtocolArtifact, []);

    await expect(action).not.to.be.reverted;
  });

  const builder = async () => {
    return deployContract(creator, TalentProtocolArtifact, []) as Promise<TalentProtocol>;
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

    it("mints the full supply to the creator", async () => {
      expect(await tal.totalSupply()).to.eq(parseUnits("10000"));
      expect(await tal.balanceOf(creator.address)).to.eq(parseUnits("10000"));
    });
  });
});
