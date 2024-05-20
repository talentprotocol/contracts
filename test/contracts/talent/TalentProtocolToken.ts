import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { TalentProtocolToken } from "../../../typechain-types";
import { Artifacts } from "../../shared";

import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentProtocolToken", () => {
  let admin: SignerWithAddress;
  let holderOne: SignerWithAddress;
  let holderTwo: SignerWithAddress;
  let holderThree: SignerWithAddress;

  let token: TalentProtocolToken;

  beforeEach(async () => {
    [admin, holderOne, holderTwo, holderThree] = await ethers.getSigners();
  });

  async function builder() {
    return deployContract(admin, Artifacts.TalentProtocolToken, [admin.address]);
  }

  describe("Deploy base contarct", () => {
    beforeEach(async () => {
      token = (await builder()) as TalentProtocolToken;
    });

    it("deploys and set ups the initial state correctly", async () => {
      expect(await token.name()).to.eq("TalentProtocolToken");
      expect(await token.symbol()).to.eq("TALENT");
      expect(await token.decimals()).to.eq(18);
      expect(await token.totalSupply()).to.eq(ethers.utils.parseEther("1000000000"));
      expect(await token.balanceOf(admin.address)).to.eq(ethers.utils.parseEther("1000000000"));
      expect(await token.paused()).to.eq(true);
    });
  });
});
