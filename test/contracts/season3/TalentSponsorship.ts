import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { USDTMock, TalentSponsorship } from "../../../typechain-types";
import { Artifacts } from "../../shared";

import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("VirtualTAL", () => {
  let admin: SignerWithAddress;
  let supporter: SignerWithAddress;
  let badActor: SignerWithAddress;
  let talent: SignerWithAddress;

  let contract: TalentSponsorship;
  let stable: USDTMock;

  beforeEach(async () => {
    [admin, supporter, badActor, talent] = await ethers.getSigners();

    stable = (await deployContract(admin, Artifacts.USDTMock, [])) as USDTMock;

    await stable.connect(admin).transfer(supporter.address, parseUnits("10000"));
  });

  async function builder() {
    return deployContract(admin, Artifacts.TalentSponsorship, [admin.address]);
  }

  describe("behaviour", () => {
    beforeEach(async () => {
      contract = (await builder()) as TalentSponsorship;
    });

    it("is created with no state", async () => {
      expect(await contract.totalSponsorships()).to.eq(0);
      expect(await contract.totalRevokedSponsorships()).to.eq(0);
      expect(await contract.totalClaimedSponsorships()).to.eq(0);
    });

    it("emits a SponsorshipCreated event everytime a sponsorship is created", async () => {
      const amount = parseUnits("10");
      await stable.connect(supporter).approve(contract.address, amount);

      const tx = await contract.connect(supporter).sponsor(talent.address, amount, stable.address);

      const event = await findEvent(tx, "SponsorshipCreated");

      expect(event).to.exist;
      expect(event?.args?.sponsor).to.eq(supporter.address);
      expect(event?.args?.talent).to.be.eq(talent.address);
      expect(event?.args?.amount).to.equal(amount);
      expect(event?.args?.token).to.equal(stable.address);
      expect(event?.args?.symbol).to.equal(await stable.symbol());

      expect(await stable.balanceOf(contract.address)).to.eq(amount);

      expect(await contract.totalSponsorships()).to.eq(1);
    });

    it("emits a Withdraw Event everytime a talent withdraws", async () => {
      const amount = parseUnits("10");
      await stable.connect(supporter).approve(contract.address, amount);

      await contract.connect(supporter).sponsor(talent.address, amount, stable.address);

      expect(await contract.connect(talent).amountAvailable(stable.address)).to.eq(amount);
      expect(await stable.balanceOf(contract.address)).to.eq(amount);

      const tx = await contract.connect(talent).withdrawToken(supporter.address, stable.address);

      const event = await findEvent(tx, "Withdraw");

      expect(event).to.exist;
      expect(event?.args?.talent).to.be.eq(talent.address);
      expect(event?.args?.amount).to.equal(amount);
      expect(event?.args?.token).to.equal(stable.address);
      expect(event?.args?.symbol).to.equal(await stable.symbol());

      expect(await contract.totalSponsorships()).to.eq(1);
      expect(await contract.totalClaimedSponsorships()).to.eq(1);
      expect(await stable.balanceOf(talent.address)).to.eq(amount);
    });

    it("emits a SponsorshipRevoked Event everytime a sponsorship is revoked", async () => {
      const amount = parseUnits("10");
      const sponsorInitialStableAmount = await stable.balanceOf(supporter.address);

      await stable.connect(supporter).approve(contract.address, amount);

      await contract.connect(supporter).sponsor(talent.address, amount, stable.address);

      expect(await contract.connect(talent).amountAvailable(stable.address)).to.eq(amount);
      expect(await stable.balanceOf(contract.address)).to.eq(amount);

      const tx = await contract.connect(supporter).revokeSponsor(talent.address, stable.address);

      const event = await findEvent(tx, "SponsorshipRevoked");

      expect(event).to.exist;
      expect(event?.args?.talent).to.be.eq(talent.address);
      expect(event?.args?.amount).to.equal(amount);
      expect(event?.args?.token).to.equal(stable.address);
      expect(event?.args?.symbol).to.equal(await stable.symbol());

      expect(await stable.balanceOf(talent.address)).to.eq(0);
      expect(await stable.balanceOf(supporter.address)).to.eq(sponsorInitialStableAmount);
      expect(await contract.totalSponsorships()).to.eq(1);
      expect(await contract.totalRevokedSponsorships()).to.eq(1);
    });

    it("prevents bad actors to steal from the contract", async () => {
      const amount = parseUnits("10");
      await stable.connect(supporter).approve(contract.address, amount);

      await contract.connect(supporter).sponsor(talent.address, amount, stable.address);

      const action = contract.connect(badActor).withdrawToken(supporter.address, stable.address);

      await expect(action).to.be.revertedWith("There are no funds for you to retrieve");
    });

    it("prevents bad actors to revoke sponsorships", async () => {
      const amount = parseUnits("10");
      await stable.connect(supporter).approve(contract.address, amount);

      await contract.connect(supporter).sponsor(talent.address, amount, stable.address);

      const action = contract.connect(badActor).revokeSponsor(talent.address, stable.address);

      await expect(action).to.be.revertedWith("There's no pending sponsorship to revoke");
    });
  });

  describe("testing contract enable and disable", () => {
    beforeEach(async () => {
      contract = (await builder()) as TalentSponsorship;
    });

    it("allows the contract owner to disable and enable the contract", async () => {
      expect(await contract.disabled()).to.be.equal(false);

      await contract.connect(admin).disable();

      expect(await contract.disabled()).to.be.equal(true);

      await contract.connect(admin).enable();

      expect(await contract.disabled()).to.be.equal(false);
    });

    it("prevents other accounts to disable the contract", async () => {
      expect(await contract.disabled()).to.be.equal(false);

      const action = contract.connect(badActor).enable();

      await expect(action).to.be.reverted;

      expect(await contract.disabled()).to.be.equal(false);
    });

    it("prevents other accounts to enable the contract", async () => {
      const action = contract.connect(badActor).enable();

      await expect(action).to.be.reverted;
    });

    it("prevents disable when the contract is already disabled", async () => {
      expect(await contract.disabled()).to.be.equal(false);

      await contract.connect(admin).disable();

      const action = contract.connect(admin).disable();

      await expect(action).to.be.reverted;
    });

    it("prevents new sponsors when the contract is disabled", async () => {
      expect(await contract.disabled()).to.be.equal(false);

      await contract.connect(admin).disable();

      expect(await contract.disabled()).to.be.equal(true);

      const amount = parseUnits("10");
      await stable.connect(supporter).approve(contract.address, amount);

      const action = contract.connect(supporter).sponsor(talent.address, amount, stable.address);

      await expect(action).to.be.revertedWith("The contract is currently disabled.");
    });
  });
});
