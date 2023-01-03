import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import type {
  TalentProtocol,
  USDTMock,
  TalentFactory,
  StakingV2,
  TalentToken,
  VirtualTAL,
} from "../../typechain-types";

import { Artifacts } from "../shared";
import { deployTalentToken, ensureTimestamp } from "../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("StakingV2", () => {
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;

  let tal: TalentProtocol;
  let stable: USDTMock;
  let talentToken1: TalentToken;
  let talentToken2: TalentToken;
  let factory: TalentFactory;
  let stakingV2: StakingV2;
  let VirtualTALFactory: ContractFactory;
  let virtualTAL: VirtualTAL;

  let start = dayjs().add(1, "day").unix();
  let end = dayjs.unix(start).add(100, "days").unix();
  const rewards = parseUnits("100");
  const margin = parseUnits("0.001") as unknown as number;

  beforeEach(async () => {
    const lastBlock = await ethers.provider.getBlockNumber();
    const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;

    start = dayjs.unix(timestamp).add(1, "day").unix(); // one minute later
    end = dayjs.unix(timestamp).add(100, "days").unix();

    [owner, minter, talent1, talent2, investor1, investor2] = await ethers.getSigners();

    stable = (await deployContract(owner, Artifacts.USDTMock, [])) as USDTMock;

    await stable.connect(owner).transfer(investor1.address, parseUnits("10000"));
    await stable.connect(owner).transfer(investor2.address, parseUnits("10000"));

    const TalentProtocolFactory = await ethers.getContractFactory("TalentProtocol");
    tal = (await upgrades.deployProxy(TalentProtocolFactory, [parseUnits("1000000000")])) as TalentProtocol;

    await tal.connect(owner).transfer(investor1.address, parseUnits("1000"));
    await tal.connect(owner).transfer(investor2.address, parseUnits("1000"));

    // factory is deployed as a proxy already, to ensure `initialize` is called
    const FactoryFactory = await ethers.getContractFactory("TalentFactory");
    factory = (await upgrades.deployProxy(FactoryFactory, [])) as TalentFactory;
  });

  const stakingV2Builder = async (): Promise<StakingV2> => {
    const StakingV2Contract = await ethers.getContractFactory("StakingV2");
    const staking = await upgrades.deployProxy(StakingV2Contract, [
      start,
      end,
      rewards,
      stable.address,
      factory.address,
      parseUnits("0.02"),
      parseUnits("5"),
    ]);
    await staking.deployed();

    return staking as StakingV2;
  };

  describe("functions", () => {
    beforeEach(async () => {
      const lastBlock = await ethers.provider.getBlockNumber();
      const timestamp = (await ethers.provider.getBlock(lastBlock)).timestamp;
      start = dayjs.unix(timestamp).add(1, "day").unix(); // one minute later

      stakingV2 = await stakingV2Builder();

      await factory.setMinter(stakingV2.address);

      talentToken1 = await deployTalentToken(factory, minter, talent1, "Fred Moura", "FRED");
      talentToken2 = await deployTalentToken(factory, minter, talent2, "Francisco Leal", "LEAL");

      await ensureTimestamp(start);
    });

    describe("isV2", () => {
      it("returns true", async () => {
        expect(await stakingV2.isV2()).to.eq(true);
      });
    });

    describe("setVirtualTALAddress", () => {
      async function virtualTALBuilder(): Promise<VirtualTAL> {
        return upgrades.deployProxy(VirtualTALFactory, []) as Promise<VirtualTAL>;
      }

      beforeEach(async () => {
        VirtualTALFactory = await ethers.getContractFactory("VirtualTAL");
        virtualTAL = await virtualTALBuilder();
      });

      it("is callable by an admin", async () => {
        await stakingV2.connect(owner).setVirtualTALAddress(virtualTAL.address);

        expect(await stakingV2.virtualTALAddress()).to.eq(virtualTAL.address);
      });

      it("is not callable by a random user", async () => {
        const action = stakingV2.connect(investor1).setVirtualTALAddress(virtualTAL.address);

        await expect(action).to.be.revertedWith(
          `AccessControl: account ${investor1.address.toLowerCase()} is missing role ${await stakingV2.DEFAULT_ADMIN_ROLE()}`
        );
      });
    });

    describe("createStakeWithVirtualTAL", () => {
      async function virtualTALBuilder(): Promise<VirtualTAL> {
        return upgrades.deployProxy(VirtualTALFactory, []) as Promise<VirtualTAL>;
      }

      beforeEach(async () => {
        VirtualTALFactory = await ethers.getContractFactory("VirtualTAL");
        virtualTAL = await virtualTALBuilder();

        await stakingV2.connect(owner).setVirtualTALAddress(virtualTAL.address);
        await virtualTAL.connect(owner).setAdminRole(stakingV2.address);
      });

      it("create stake and burns virtual TAL", async () => {
        await virtualTAL.adminMint(investor1.address, parseUnits("100"));
        const action = await stakingV2
          .connect(investor1)
          .createStakeWithVirtualTAL(talentToken1.address, parseUnits("100"));

        // mints talent tokens
        const talentBalance = await talentToken1.balanceOf(investor1.address);
        const expectedBalance = await stakingV2.convertTokenToTalent(parseUnits("100"));

        expect(talentBalance).to.equal(expectedBalance);
        expect(talentBalance).not.to.equal(parseUnits("0"));

        //  burns virtual TAL
        const virtualTALBalance = await virtualTAL.getBalance(investor1.address);
        expect(virtualTALBalance).to.equal(parseUnits("0"));

        await expect(action).to.emit(stakingV2, "Stake");
      });
    });

    describe("sellTalentTokenWithVirtualTAL", () => {
      async function virtualTALBuilder(): Promise<VirtualTAL> {
        return upgrades.deployProxy(VirtualTALFactory, []) as Promise<VirtualTAL>;
      }

      beforeEach(async () => {
        VirtualTALFactory = await ethers.getContractFactory("VirtualTAL");
        virtualTAL = await virtualTALBuilder();

        await stakingV2.connect(owner).setVirtualTALAddress(virtualTAL.address);
        await virtualTAL.connect(owner).setAdminRole(stakingV2.address);
      });

      it("partially sells talent tokens and mints virtual TAL", async () => {
        await stable.connect(investor1).approve(stakingV2.address, parseUnits("1"));
        await stakingV2.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));

        const action = await stakingV2
          .connect(investor1)
          .sellTalentTokenWithVirtualTAL(talentToken1.address, parseUnits("2"));

        // burns talent tokens
        const talentBalance = await talentToken1.balanceOf(investor1.address);
        // 10 - 2 = 8 + margin to account for rewards
        expect(talentBalance).to.be.closeTo(parseUnits("8"), margin);

        // mints virtual TAL
        const virtualTALBalance = await virtualTAL.getBalance(investor1.address);
        const expectedBalance = await stakingV2.convertTalentToToken(parseUnits("2"));

        expect(virtualTALBalance).to.be.closeTo(expectedBalance, margin);

        await expect(action).to.emit(stakingV2, "Unstake");
      });

      it("sells all talent tokens and mints virtual TAL", async () => {
        await stable.connect(investor1).approve(stakingV2.address, parseUnits("1"));
        await stakingV2.connect(investor1).stakeStable(talentToken1.address, parseUnits("1"));

        const action = await stakingV2
          .connect(investor1)
          .sellTalentTokenWithVirtualTAL(talentToken1.address, parseUnits("10"));

        // burns talent tokens
        const talentBalance = await talentToken1.balanceOf(investor1.address);
        // 10 - 10 = exactly 0 to include rewards
        expect(talentBalance).to.equal(parseUnits("0"));

        // mints virtual TAL
        const virtualTALBalance = await virtualTAL.getBalance(investor1.address);
        const expectedBalance = await stakingV2.convertTalentToToken(parseUnits("10"));

        expect(virtualTALBalance).to.be.closeTo(expectedBalance, margin);

        await expect(action).to.emit(stakingV2, "Unstake");
      });
    });
  });
});
