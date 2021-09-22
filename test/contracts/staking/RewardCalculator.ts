import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { BigNumber } from "ethers";
import type { TestRewardCalculator } from "../../../typechain";

import { Artifacts } from "../../shared";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("RewardCalculator", () => {
  let owner: SignerWithAddress;
  let calculator: TestRewardCalculator;

  const mul = 1e6;
  const start = 100;
  const end = 200;

  async function builder(given: BigNumber, totalShares: BigNumber): Promise<TestRewardCalculator> {
    return (await deployContract(owner, Artifacts.TestRewardCalculator, [
      start,
      end,
      parseUnits("100"),
      given,
      totalShares,
    ])) as TestRewardCalculator;
  }

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    calculator = await builder(parseUnits("0"), parseUnits("4000"));
  });

  describe("_truncatePeriod", () => {
    it("truncates given startDate", async () => {
      const [r1, r2] = await calculator.test_truncatePeriod(start - 1, start + 1);

      expect(r1).to.eq(start);
      expect(r2).to.eq(start + 1);
    });

    it("truncates given endDate", async () => {
      const [r1, r2] = await calculator.test_truncatePeriod(start + 1, end + 1);

      expect(r1).to.eq(start + 1);
      expect(r2).to.eq(end);
    });

    it("gives a 0-length period if outside of bounds", async () => {
      const [r1, r2] = await calculator.test_truncatePeriod(end + 1, end + 2);

      expect(r1).to.eq(r2);
    });
  });
  describe("_periodToPercents", () => {
    it("calculates 0% to 100%", async () => {
      const [r1, r2] = await calculator.test_periodToPercents(start, end);

      expect(r1).to.eq(0);
      expect(r2).to.eq(mul);
    });

    it("calculates 0% to 50%", async () => {
      const [r1, r2] = await calculator.test_periodToPercents(start, start + (end - start) * 0.5);

      expect(r1).to.eq(0);
      expect(r2).to.eq(mul * 0.5);
    });

    it("calculates 50% to 100%", async () => {
      const [r1, r2] = await calculator.test_periodToPercents((start + end) / 2, end);

      expect(r1).to.eq(mul * 0.5);
      expect(r2).to.eq(mul * 1);
    });

    it("calculates 10% to 90%", async () => {
      const [r1, r2] = await calculator.test_periodToPercents(start + (end - start) * 0.1, start + (end - start) * 0.9);

      expect(r1).to.equal(mul * 0.1);
      expect(r2).to.equal(mul * 0.9);
    });
  });
});
