const chai = require("chai");
const { assert } = require("chai");
const { ethers, waffle } = require("hardhat");
const { solidity } = require("ethereum-waffle");

const TalentProtocol = require("../artifacts/contracts/TalentProtocol.sol/TalentProtocol.json");
const TalentProtocolFactory = require("../artifacts/contracts/TalentProtocolFactory.sol/TalentProtocolFactory.json");
const CareerCoin = require("../artifacts/contracts/CareerCoin.sol/CareerCoin.json");

chai.use(solidity);

const { expect } = chai;
const { parseEther, parseUnits } = ethers.utils;

function tokens(n) {
  // return web3.utils.toWei(n, "ether");
}

const DEFAULT_RESERVE_RATIO = 1000000;

describe("TalentProtocol", (accounts) => {
  let creator;
  let investor;
  let talent1;
  let talent2;

  let talentProtocol, talentProtocolFactory;
  let careerCoin;
  let talentList;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    creator = signers[0];
    investor = signers[1];
    talent1 = signers[2];
    talent2 = signers[3];
  });

  beforeEach(async () => {
    // Load contracts
    talentProtocol = await waffle.deployContract(creator, TalentProtocol, [
      "Talent Protocol",
      "TAL",
      18,
      parseUnits("1000"),
    ]);

    talentProtocolFactory = await waffle.deployContract(
      creator,
      TalentProtocolFactory,
      [talentProtocol.address]
    );

    await talentProtocol.transfer(investor.address, parseEther("10"));
  });

  describe("Talent Protocol Deployment", () => {
    it("Has a name", async () => {
      const name = await talentProtocol.name();

      expect(name).to.equal("Talent Protocol");
    });
  });

  describe("Talent Protocol Factory Deployment", () => {
    it("Has a name", async () => {
      const name = await talentProtocolFactory.name();

      expect(name).to.equal("Talent Protocol Factory");
    });

    it("Add new talent (Force test fail Symbol between 3 - 8 chars)", async () => {
      try {
        await talentProtocolFactory.instanceNewTalent(
          "J",
          "John Doe",
          DEFAULT_RESERVE_RATIO,
          talent1,
          7
        );
      } catch (error) {}

      talentList = await talentProtocolFactory.getTalentList();

      console.log(talentList);

      expect(talentList.length).to.equal(0);
    });

    it("Add new talent (Force test fail for Name)", async () => {
      try {
        await talentProtocolFactory.instanceNewTalent(
          "JDOE",
          "",
          DEFAULT_RESERVE_RATIO,
          talent1,
          5
        );
      } catch (error) {}

      talentList = await talentProtocolFactory.getTalentList();
      expect(talentList.length).to.equal(0);
    });

    it("Add new talent (Force test fail for Talent address empty)", async () => {
      try {
        await talentProtocolFactory.instanceNewTalent(
          "JDOE",
          "John Doe",
          DEFAULT_RESERVE_RATIO,
          "",
          3
        );
      } catch (error) {}

      talentList = await talentProtocolFactory.getTalentList();
      expect(talentList.length).to.equal(0);
    });

    it("Add new talent (Force test fail for Talent fee zero or negative)", async () => {
      try {
        await talentProtocolFactory.instanceNewTalent(
          "JDOE",
          "John Doe",
          DEFAULT_RESERVE_RATIO,
          talent1.address,
          0
        );
      } catch (error) {}

      talentList = await talentProtocolFactory.getTalentList();
      expect(talentList.length).to.equal(0);
    });

    it("Add new talent #1", async () => {
      talentList = await talentProtocolFactory.getTalentList();
      expect(talentList.length).to.equal(0);

      await talentProtocolFactory.instanceNewTalent(
        "JDOE",
        "John Doe",
        DEFAULT_RESERVE_RATIO,
        talent1.address,
        5
      );

      talentList = await talentProtocolFactory.getTalentList();
      expect(talentList.length).to.equal(1);
    });

    it("Add new talent #2", async () => {
      await talentProtocolFactory.instanceNewTalent(
        "MDOE",
        "Mary Doe",
        DEFAULT_RESERVE_RATIO,
        talent2.address,
        5
      );

      talentList = await talentProtocolFactory.getTalentList();
      expect(talentList.length).to.equal(1);
    });

    it("List talent data", async () => {
      talentList = await talentProtocolFactory.getTalentList();

      for (var i = 0; i < talentList.length; i++) {
        console.log(talentList[i]);
      }
    });

    it("Validade first element #1", async () => {
      console.log(
        "---- VALIDATING TALENT #1 - Garantee all functions work properly ----"
      );

      // get first talent
      careerCoin = await CareerCoin.at(talentList[0]);
    });

    describe("#1 talent", () => {
      beforeEach(async () => {
        await talentProtocolFactory.instanceNewTalent(
          "JDOE",
          "John Doe",
          DEFAULT_RESERVE_RATIO,
          talent1.address,
          5
        );
        careerCoin = await CareerCoin.at(talentList[0]);
      });

      it("Has correct talent #1 name", async () => {
        const name = await careerCoin.name();
        expect(name).to.equal("John Doe");
      });

      it("Has correct talent #1 symbol", async () => {
        const symbol = await careerCoin.symbol();
        expect(symbol).to.equal("JDOE");
      });

      it("Has correct talent #1 totalSupply == 0", async () => {
        const totalSupply = await careerCoin.totalSupply();
        expect(totalSupply.toString()).to.equal(parseEther("0"));
      });
    });

    it("Can mint tokens with ether following the bounding curve", async function() {
      let allCoins = await talentProtocolFactory.getTalentList();

      // generate JDOE token coin if necessary
      if (allCoins.length < 1) {
        await talentProtocolFactory.instanceNewTalent(
          "JDOE",
          "John Doe",
          DEFAULT_RESERVE_RATIO,
          talent1.address,
          5
        );
        allCoins = await talentProtocolFactory.getTalentList();
      }

      const coin = await CareerCoin.at(allCoins[0]);

      // Add reserve if empty
      if (parseUnits(await coin.reserveBalance()) == "0") {
        await coin.initialMint(parseEther("10"));
      }

      // first investor buys 10 more ether
      const depositAmount = parseEther("10");
      await coin.mint({ from: investor, value: depositAmount });

      const amount = await coin.balanceOf(investor);
      expect(amount).to.equal("10");

      const reserve = await coin.reserveBalance();
      expect(reserve).to.equal("10");

      await coin.connect(investor).mint({ value: depositAmount });
      await coin.connect(investor).mint({ value: depositAmount });
      await coin.connect(investor).mint({ value: depositAmount });
      await coin.connect(investor).mint({ value: depositAmount });
      await coin.connect(investor).mint({ value: depositAmount });
      await coin.connect(investor).mint({ value: depositAmount });
      await coin.connect(investor).mint({ value: depositAmount });

      const reserveAfterMultipleTransactions = await coin.reserveBalance();
      expect(reserveAfterMultipleTransactions).to.equal("100");

      const balanceOfInvestorAfterMultipleTransactions = await coin.balanceOf(
        investor.address
      );
      expect(balanceOfInvestorAfterMultipleTransactions).to.equal("90");
    });

    it("Can burn minted tokens for ether", async function() {
      let allCoins = await talentProtocolFactory.getTalentList();

      // generate JDOE token coin if necessary
      if (allCoins.length < 1) {
        await talentProtocolFactory.instanceNewTalent(
          "JDOE",
          "John Doe",
          DEFAULT_RESERVE_RATIO,
          talent1.address,
          5
        );
        allCoins = await talentProtocolFactory.getTalentList();
      }

      const coin = await CareerCoin.at(allCoins[0]);

      // Add reserve if empty
      if ((await coin.reserveBalance()) == "0") {
        await coin.initialMint(parseEther("10"));
      }

      // Add funds to investor if needed
      if ((await coin.balanceOf(investor)) == "0") {
        const depositAmount = parseEther("10", "ether");
        await coin.connect(investor).mint({ value: depositAmount });
      }

      const allInvestorBalance = await coin.balanceOf(investor.address);

      const beforeBurnReserve = await coin.reserveBalance();

      await coin.connect(investor).burn(allInvestorBalance);

      const reserveAfterBurn = await coin.reserveBalance();
      const expectedReserveAfterBurn = beforeBurnReserve.sub(
        allInvestorBalance
      );
      expect(reserveAfterBurn).to.equal(expectedReserveAfterBurn);

      const balanceOfInvestorAfterBurn = await coin.balanceOf(investor.address);
      expect(balanceOfInvestorAfterBurn).to.equal("0");
    });

    it("Mint & Burn Career coins with TAL", async function() {
      let allCoins = await talentProtocolFactory.getTalentList();

      // generate JDOE token coin if necessary
      if (allCoins.length < 1) {
        await talentProtocolFactory.instanceNewTalent(
          "JDOE",
          "John Doe",
          DEFAULT_RESERVE_RATIO,
          talent1.address,
          5
        );
        allCoins = await talentProtocolFactory.getTalentList();
      }

      const coin = await CareerCoin.at(allCoins[0]);

      // Add reserve if empty
      if ((await coin.reserveBalance()) == "0") {
        await coin.initialMint(parseEther("10"));
      }

      let balanceOfTal = await talentProtocol.balanceOf(investor.address);
      if (balanceOfTal < 5) {
        await talentProtocol.transfer(
          investor.address,
          parseEther("10", "ether")
        );
        balanceOfTal = await talentProtocol.balanceOf(investor.address);
      }

      const amount = parseEther("5");

      await talentProtocol.connect(investor).approve(coin.address, amount);

      await coin.tMint(talentProtocol.address, {
        from: investor.address,
        value: amount,
      });

      const balanceOfTalAfterMint = await talentProtocol.balanceOf(
        investor.address
      );
      expect(balanceOfTalAfterMint).to.equal(balanceOfTal - 5);

      const balanceAfterMint = await coin.balanceOf(investor.address);
      expect(balanceAfterMint).to.equal(5);

      const talBalanceOfCoin = await talentProtocol.balanceOf(coin.address);
      expect(talBalanceOfCoin).to.equal(5);

      await coin.tBurn(talentProtocol.address, {
        from: investor,
        value: amount,
      });

      const balanceOfTalAfterBurn = await talentProtocol.balanceOf(
        investor.address
      );
      expect(balanceOfTalAfterBurn, balanceOfTal).to.equal();

      const balanceAfterBurn = await coin.balanceOf(investor.address);
      expect(balanceAfterBurn).to.equal(0);

      const talBalanceOfCoinAfterBurn = await talentProtocol.balanceOf(
        coin.address
      );
      expect(talBalanceOfCoinAfterBurn).to.equal(0);
    });
  });
});
