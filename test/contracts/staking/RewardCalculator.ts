import chai from "chai";
import { ethers, waffle, network } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TestRewardCalculator } from "../../../typechain";
import { BigNumber } from "ethers";

import { Artifacts } from "../../shared";
import { sqrt } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("RewardCalculator", () => {
  let owner: SignerWithAddress;
  let calculator: TestRewardCalculator;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
  });

  describe("with static test parameters", () => {
    const mul = 1e10;
    const start = 100;
    const end = 200;

    async function builder(totalShares: BigNumber, totalAdjustedShares: BigNumber): Promise<TestRewardCalculator> {
      return (await deployContract(owner, Artifacts.TestRewardCalculator, [
        start,
        end,
        parseUnits("100"),
        parseUnits("0"),
        totalShares,
        totalAdjustedShares,
      ])) as TestRewardCalculator;
    }

    beforeEach(async () => {
      calculator = await builder(parseUnits("4000"), parseUnits("4000"));
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
        const [r1, r2] = await calculator.test_periodToPercents(
          start + (end - start) * 0.1,
          start + (end - start) * 0.9
        );

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
          const apr = await calculator.test_curvePercentage(step.mul(i * 10), step.mul((i + 1) * 10));

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

    describe("integralAt", () => {
      // values retrieved via Wolfram Alpha
      // https://www.wolframalpha.com/input/?i=solve+x%5E3%2F3+-+mx%5E2+%2B+m%5E2+*+x%2C+m%3D1000000%2C+x%3D1000000
      it("has the expected result at 0%", async () => {
        expect(await calculator.test_integralAt(0)).to.equal(0);
      });

      it("has the expected result at 50%", async () => {
        const x = (await calculator.multiplier()).div(2);
        const y = BigNumber.from("875000000000000000").div("3");

        expect(await calculator.test_integralAt(x)).to.equal(y);
      });

      it("has the expected result at the 100% point", async () => {
        const x = await calculator.multiplier();
        const y = BigNumber.from("1000000000000000000").div("3");

        expect(await calculator.test_integralAt(x)).to.equal(y);
      });
    });
  });

  describe("calculateReward", () => {
    const duration = 10000;
    const start = 0;
    const end = duration;

    // let each staking period last for 10.000 seconds
    const totalRewards = parseUnits("100");

    async function builder(
      start: number,
      end: number,
      ownerShares: BigNumber,
      otherShares: BigNumber[]
    ): Promise<TestRewardCalculator> {
      const totalShares = otherShares.reduce((accum, share) => accum.add(share), ownerShares);
      const totalAdjustedShares = otherShares.reduce((accum, share) => accum.add(sqrt(share)), sqrt(ownerShares));

      return (await deployContract(owner, Artifacts.TestRewardCalculator, [
        start,
        end,
        totalRewards,
        parseUnits("0"),
        totalShares,
        totalAdjustedShares,
      ])) as TestRewardCalculator;
    }

    describe("single staker with 1 TAL staked", () => {
      const ownerShares = parseUnits("1");
      const otherShares: BigNumber[] = [];
      // const totalAdjustedShares = parseUnits("1");

      beforeEach(async () => {
        calculator = await builder(start, end, ownerShares, otherShares);
      });

      it.only("stays from 0% to 100%, receives 100% of the reward", async () => {
        const rewards = await calculator.test_calculateReward(ownerShares, start, end);
        expect(rewards).to.eq(totalRewards);
      });
    });
  });
});
