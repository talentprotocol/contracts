import chai from "chai";
import { ethers, network, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TalentProtocol, USDTMock, TalentFactory, Staking, TalentToken } from "../../typechain";

import { ERC165, Artifacts } from "../shared";
import { deployTalentToken, transferAndCall } from "../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("Staking", () => {
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let talent3: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;
  let investor3: SignerWithAddress;

  let tal: TalentProtocol;
  let stable: USDTMock;
  let talentToken1: TalentToken;
  let talentToken2: TalentToken;
  let talentToken3: TalentToken;
  let factory: TalentFactory;
  let staking: Staking;

  let start = dayjs().add(1, "day").unix();
  let end = dayjs.unix(start).add(100, "days").unix();

  const rewards = parseUnits("100");

  // deploy setup
  beforeEach(async () => {
    const lastBlock = await ethers.provider.getBlockNumber();
    const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;

    start = dayjs.unix(timestamp).add(1, "day").unix(); // one minute later
    end = dayjs.unix(timestamp).add(100, "days").unix();

    [owner, minter, talent1, talent2, talent3, investor1, investor2, investor3] = await ethers.getSigners();

    stable = (await deployContract(owner, Artifacts.USDTMock, [])) as USDTMock;

    tal = (await deployContract(owner, Artifacts.TalentProtocol, [])) as TalentProtocol;

    factory = (await deployContract(owner, Artifacts.TalentFactory, [])) as TalentFactory;

    staking = (await deployContract(owner, Artifacts.Staking, [
      start,
      end,
      rewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("50"),
    ])) as Staking;

    await factory.setMinter(staking.address);

    // deploy talent tokens
    talentToken1 = await deployTalentToken(factory, minter, talent1, "Miguel Palhas", "NAPS");
    talentToken2 = await deployTalentToken(factory, minter, talent2, "Francisco Leal", "LEAL");
    talentToken3 = await deployTalentToken(factory, minter, talent2, "Andreas Vilela", "AVIL");

    // fund investors
    await stable.connect(owner).transfer(investor1.address, parseUnits("1000000"));
    await stable.connect(owner).transfer(investor2.address, parseUnits("1000000"));
    await stable.connect(owner).transfer(investor3.address, parseUnits("1000000"));
    await tal.connect(owner).transfer(investor1.address, parseUnits("100000"));
    await tal.connect(owner).transfer(investor2.address, parseUnits("100000"));
    await tal.connect(owner).transfer(investor3.address, parseUnits("100000"));
  });

  function ensureTimestamp(timestamp: number): Promise<unknown> {
    return network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  }

  async function enterPhaseTwo() {
    await staking.setToken(tal.address);
    await tal.connect(owner).transfer(staking.address, rewards);
  }

  it("single staker, full period, same weight as talent", async () => {
    const amount = parseUnits("1000");
    await stable.connect(investor1).approve(staking.address, amount);
    await staking.stakeStable(talentToken1.address, amount);

    // travel to end of staking
    ensureTimestamp(end);

    await staking.connect(investor1).claimRewards(talentToken1.address);
  });
});
