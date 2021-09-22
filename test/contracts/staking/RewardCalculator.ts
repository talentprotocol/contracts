import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import dayjs from "dayjs";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TestRewardCalculator } from "../../../typechain";
import { BigNumber } from "ethers";

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

  describe("curvePercentage", () => {
    it("is maximum from 0% to 100%", async () => {
      const apr1 = await calculator.test_curvePercentage(0, mul);
      const apr2 = await calculator.test_curvePercentage(0, mul * 0.9);

      expect(apr1).to.be.gt(apr2);
    });

    it("is greater if you enter earlier but stay the same time", async () => {
      const apr1 = await calculator.test_curvePercentage(0, mul * 0.3);
      const step = BigNumber.from(mul * 0.01);
      const apr2 = await calculator.test_curvePercentage(step.mul(10), step.mul(40));

      expect(apr1).to.be.gt(apr2);
    });

    it("each 10% segment is smaller than or equal the last", async () => {
      let last: BigNumber | number = BigNumber.from("10").pow(100);
      const step = BigNumber.from(mul * 0.01);

      for (let i = 0; i < 10; i += 1) {
        const apr = await calculator.test_curvePercentage(step.mul(i), step.mul(i + 10));

        expect(apr).to.be.lte(last);
        last = apr;
      }
    });

    it("staying for 10% more increases your total APR", async () => {
      let last: BigNumber | number = 0;
      const step = BigNumber.from(mul * 0.01);

      for (let i = 0; i < 10; i += 1) {
        const apr = await calculator.test_curvePercentage(0, step.mul(i));

        expect(apr).to.be.gte(last);
        last = apr;
      }
    });

    it("at least on the first 80%, each 10% segment is smaller than the last", async () => {
      let last: BigNumber | number = 10e10;

      for (let i = 0; i < 800000; i += 100000) {
        const apr = await calculator.test_curvePercentage(i, i + 100000);

        expect(apr).to.be.lt(last);
        last = apr;
      }
    });
  });
});
