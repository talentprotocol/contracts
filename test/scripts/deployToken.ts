import chai from "chai";
import { ethers } from "hardhat";

import { deployToken } from "../../scripts/shared";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { TalentProtocol__factory } from "../../typechain/factories/TalentProtocol__factory";

const { expect } = chai;
const { parseUnits } = ethers.utils;

describe("deployToken", () => {
  let creator: SignerWithAddress;

  beforeEach(async () => {
    [creator] = await ethers.getSigners();
  });

  it("deploys a TAL instance", async () => {
    const tal = await deployToken();

    expect(await tal.balanceOf(creator.address)).to.eq(parseUnits("10000"));
  });
});
