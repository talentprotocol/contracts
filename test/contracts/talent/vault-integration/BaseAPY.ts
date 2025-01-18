import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TalentProtocolToken, TalentVaultV2, BaseAPY } from "../../../../typechain-types";
import { Artifacts } from "../../../shared";
import { ensureTimestamp } from "../../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

async function ensureTimeIsAfterLockPeriod() {
  const lockPeriod = 8;
  const oneDayAfterLockPeriod = Math.floor(Date.now() / 1000) + lockPeriod * 24 * 60 * 60;
  await ensureTimestamp(oneDayAfterLockPeriod);
}

describe("TalentVaultV2", () => {
  let admin: SignerWithAddress;
  let yieldSource: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let talentToken: TalentProtocolToken;
  let talentVault: TalentVaultV2;
  let baseAPY: BaseAPY;

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", []);

    [admin, yieldSource, user1, user2, user3] = await ethers.getSigners();

    talentToken = (await deployContract(admin, Artifacts.TalentProtocolToken, [admin.address])) as TalentProtocolToken;

    talentVault = (await deployContract(admin, Artifacts.TalentVaultV2, [talentToken.address])) as TalentVaultV2;

    baseAPY = (await deployContract(admin, Artifacts.BaseAPY, [talentToken.address, talentVault.address])) as BaseAPY;

    console.log("------------------------------------");
    console.log("Addresses:");
    console.log(`admin = ${admin.address}`);
    console.log(`user1 = ${user1.address}`);
    console.log(`user2 = ${user2.address}`);
    console.log(`user3 = ${user3.address}`);
    console.log(`talentToken = ${talentToken.address}`);
    console.log(`talentVault = ${talentVault.address}`);
    console.log(`baseAPY = ${baseAPY.address}`);
    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

    await talentToken.unpause();
  });

  it("should deposit TALENT and mint sTALENT at 1:1 ratio", async () => {
    // whitelist baseAPY
    await talentVault.connect(admin).addVaultOption(baseAPY.address);

    // transfer TALENT to user
    const depositAmount = ethers.utils.parseEther("1000");
    await talentToken.connect(admin).transfer(user1.address, depositAmount);

    // Approve the vault to spend user's TALENT
    await talentToken.connect(user1).approve(talentVault.address, depositAmount);

    // transfer TALENT to baseAPY
    const rewardAmount = ethers.utils.parseEther("100");
    await talentToken.connect(admin).transfer(baseAPY.address, rewardAmount);

    // Check initial balances
    const userInitialTalent = await talentToken.balanceOf(user1.address);
    const userInitialShares = await talentVault.balanceOf(user1.address);
    const baseAPYInitialTalent = await talentToken.balanceOf(baseAPY.address);

    // User deposits 100 TALENT to the baseAPY position
    const depositedAmount = ethers.utils.parseEther("100");
    await talentVault.connect(user1).depositToOption(depositedAmount, user1.address, baseAPY.address);

    // Check the user's final balance of TALENT
    const userFinalTalent = await talentToken.balanceOf(user1.address);
    const userFinalShares = await talentVault.balanceOf(user1.address);
    const baseAPYFinalTalent = await talentToken.balanceOf(baseAPY.address);
    const vaultFinalTalent = await talentToken.balanceOf(talentVault.address);

    // user spent 100 TALENT, and received 100 sTALENT
    expect(userInitialTalent.sub(depositedAmount)).to.eq(userFinalTalent);
    expect(userFinalShares.sub(userInitialShares)).to.eq(depositedAmount);

    // baseAPY holds the Talent transferred from user
    expect(baseAPYFinalTalent.sub(baseAPYInitialTalent)).to.eq(depositedAmount);

    // vault holds 0 TALENT because it was transferred to baseAPY
    expect(vaultFinalTalent).to.eq(0);
  });
});
