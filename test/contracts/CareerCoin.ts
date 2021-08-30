import chai from "chai";
// import { assert } = require("chai");
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

chai.use(solidity);

const { expect } = chai;
const { parseEther, parseUnits } = ethers.utils;

describe("CareerCoin", () => {
  it("works", async () => {
    expect(1).to.eq(1);
  });
});
