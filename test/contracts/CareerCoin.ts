import chai from "chai";
// import { assert } = require("chai");
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

// import { CareerCoin as CareerCoinT } from "../../artifacts/contracts/CareerCoin.sol/CareerCoin.json";
import type { CareerCoin } from "../../typechain/CareerCoin";
import type { TalentProtocol } from "../../typechain/TalentProtocol";
import type { TalentProtocolFactory } from "../../typechain/TalentProtocolFactory";

chai.use(solidity);

const { expect } = chai;
const { deployContract: deploy } = waffle;
const { parseEther, parseUnits } = ethers.utils;

describe("CareerCoin", () => {
  let talentProtocol: TalentProtocol;
  let talentProtocolFactory: TalentProtocolFactory;
  let careerCoin: CareerCoin;
  let creator: any, investor: any, talent1: any, talent2: any;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    creator = signers[0];
    investor = signers[1];
    talent1 = signers[2];
    talent2 = signers[3];

    const TalentProtocolArtifact = await ethers.getContractFactory("TalentProtocol");
    const TalentProtocolFactoryArtifact = await ethers.getContractFactory("TalentProtocolFactory");
    const CareerCoinArtifact = await ethers.getContractFactory("CareerCoin");

    talentProtocol = (await TalentProtocolArtifact.deploy("Talent Protocol", "TAL", 18, parseUnits("1000"))) as TalentProtocol;
    talentProtocolFactory = (await TalentProtocolFactoryArtifact.deploy(talentProtocol.address)) as TalentProtocolFactory;
  });

  it("works", async () => {
    expect(1).to.eq(1);
  });
});
