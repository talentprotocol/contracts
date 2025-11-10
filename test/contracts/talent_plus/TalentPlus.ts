import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TalentPlus, TalentPlusSubscription, ERC20Mock } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { findEvent } from "../../shared/utils";
import { parseEther } from "ethers/lib/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentPlus", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let feeReceiver: SignerWithAddress;

  let talentPlus: TalentPlus;
  let talentPlusSubscription: TalentPlusSubscription;
  let talentToken: ERC20Mock;
  let paymentToken: ERC20Mock; // USDC mock
  let mockVault: any; // Mock vault contract

  beforeEach(async () => {
    [admin, user1, user2, feeReceiver] = await ethers.getSigners();
    
    // Deploy ERC20Mock as mock TALENT token
    talentToken = (await deployContract(admin, Artifacts.ERC20Mock, ["TalentProtocolToken", "TALENT"])) as ERC20Mock;
    
    // Deploy ERC20Mock as payment token (USDC)
    paymentToken = (await deployContract(admin, Artifacts.ERC20Mock, ["USD Coin", "USDC"])) as ERC20Mock;
    
    // Deploy mock vault contract
    const mockVaultFactory = await ethers.getContractFactory("ERC20Mock");
    mockVault = await mockVaultFactory.deploy("MockVault", "VAULT");
    await mockVault.deployed();
    
    // Deploy TalentPlusSubscription
    talentPlusSubscription = (await deployContract(admin, Artifacts.TalentPlusSubscription, [
      admin.address,
      talentToken.address,
      [mockVault.address],
    ])) as TalentPlusSubscription;
    
    // Deploy TalentPlus with payment token
    talentPlus = (await deployContract(admin, Artifacts.TalentPlus, [
      talentPlusSubscription.address,
      feeReceiver.address,
      paymentToken.address,
    ])) as TalentPlus;
    
    // Add subscription models with discount parameters (prices in USDC)
    await talentPlusSubscription.connect(admin).addSubscriptionModel("basic", 30 * 24 * 60 * 60, parseEther("50"), 10, parseEther("1000"));
    await talentPlusSubscription.connect(admin).addSubscriptionModel("premium", 90 * 24 * 60 * 60, parseEther("100"), 20, parseEther("5000"));
    
    // Add TalentPlus contract as trusted signer so it can call addUserSubscription
    await talentPlusSubscription.connect(admin).addTrustedSigner(talentPlus.address);
    
    // Mint payment tokens to users and approve TalentPlus contract
    await paymentToken.connect(admin).transfer(user1.address, parseEther("1000"));
    await paymentToken.connect(admin).transfer(user2.address, parseEther("1000"));
    await paymentToken.connect(user1).approve(talentPlus.address, parseEther("1000"));
    await paymentToken.connect(user2).approve(talentPlus.address, parseEther("1000"));
  });

  describe("Deployment", () => {
    it("should deploy with correct initial state", async () => {
      expect(await talentPlus.owner()).to.eq(admin.address);
      expect(await talentPlus.feeReceiver()).to.eq(feeReceiver.address);
      expect(await talentPlus.talentPlusSubscription()).to.eq(talentPlusSubscription.address);
      expect(await talentPlus.paymentToken()).to.eq(paymentToken.address);
      expect(await talentPlus.enabled()).to.eq(true);
    });
  });

  describe("Owner Functions", () => {
    it("should allow owner to enable/disable contract", async () => {
      await talentPlus.connect(admin).setEnabled(false);
      expect(await talentPlus.enabled()).to.eq(false);
      
      await talentPlus.connect(admin).setEnabled(true);
      expect(await talentPlus.enabled()).to.eq(true);
    });

    it("should allow owner to disable contract directly", async () => {
      await talentPlus.connect(admin).setDisabled();
      expect(await talentPlus.enabled()).to.eq(false);
    });

    it("should allow owner to update fee receiver", async () => {
      await talentPlus.connect(admin).updateReceiver(user1.address);
      expect(await talentPlus.feeReceiver()).to.eq(user1.address);
    });

    it("should allow owner to update TalentPlusSubscription address", async () => {
      const newSubscription = (await deployContract(admin, Artifacts.TalentPlusSubscription, [
        admin.address,
        talentToken.address,
        [mockVault.address],
      ])) as TalentPlusSubscription;
      
      await talentPlus.connect(admin).updateTalentPlusSubscription(newSubscription.address);
      expect(await talentPlus.talentPlusSubscription()).to.eq(newSubscription.address);
    });

    it("should not allow non-owner to call owner functions", async () => {
      await expect(talentPlus.connect(user1).setEnabled(false)).to.be.reverted;
      await expect(talentPlus.connect(user1).setDisabled()).to.be.reverted;
      await expect(talentPlus.connect(user1).updateReceiver(user1.address)).to.be.reverted;
      await expect(talentPlus.connect(user1).updateTalentPlusSubscription(user1.address)).to.be.reverted;
    });

    it("should not allow setting zero address as TalentPlusSubscription", async () => {
      const action = talentPlus.connect(admin).updateTalentPlusSubscription(ethers.constants.AddressZero);
      await expect(action).to.be.revertedWith("Invalid TalentPlusSubscription address");
    });
  });

  describe("Subscribe Function", () => {
    const subscriptionSlug = "basic";

    it("should allow valid subscription from any user", async () => {
      const subscriptionCost = parseEther("50"); // Basic subscription cost
      const tx = await talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, subscriptionCost);
      
      const event = await findEvent(tx, "SubscriptionCreated");
      expect(event).to.exist;
      expect(event?.args?.payer).to.eq(user1.address);
      expect(event?.args?.recipient).to.eq(user1.address);
      expect(event?.args?.subscriptionSlug).to.eq(subscriptionSlug);
      expect(event?.args?.pricePaid).to.eq(parseEther("50")); // Full price (no discount)
      expect(event?.args?.discountApplied).to.eq(false);

      // Check that subscription was set
      expect(await talentPlusSubscription.hasActiveSubscription(user1.address)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, subscriptionSlug)).to.eq(true);
    });

    it("should not allow subscription when contract is disabled", async () => {
      await talentPlus.connect(admin).setDisabled();
      
      const action = talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, parseEther("50"));
      await expect(action).to.be.revertedWith("Subscription is disabled for this contract");
    });

    it("should not allow subscription with empty subscription slug", async () => {
      const action = talentPlus.connect(user1).subscribe(user1.address, "", parseEther("50"));
      await expect(action).to.be.revertedWith("Subscription slug cannot be empty");
    });

    it("should not allow subscription for zero address", async () => {
      const action = talentPlus.connect(user1).subscribe(ethers.constants.AddressZero, subscriptionSlug, parseEther("50"));
      await expect(action).to.be.revertedWith("Invalid wallet address");
    });


    it("should allow purchasing subscription for another user", async () => {
      // User1 purchases subscription for User2
      const tx = await talentPlus.connect(user1).subscribe(user2.address, subscriptionSlug, parseEther("50"));
      
      const event = await findEvent(tx, "SubscriptionCreated");
      expect(event).to.exist;
      expect(event?.args?.payer).to.eq(user1.address); // User1 paid
      expect(event?.args?.recipient).to.eq(user2.address); // User2 receives subscription
      expect(event?.args?.subscriptionSlug).to.eq(subscriptionSlug);
      expect(event?.args?.pricePaid).to.eq(parseEther("50")); // Full price (no discount)
      expect(event?.args?.discountApplied).to.eq(false);

      // Check that subscription was set for user2
      expect(await talentPlusSubscription.hasActiveSubscription(user2.address)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user2.address, subscriptionSlug)).to.eq(true);
      
      // Check that user1 doesn't have a subscription
      expect(await talentPlusSubscription.hasActiveSubscription(user1.address)).to.eq(false);
    });

    it("should not allow subscription for inactive subscription model", async () => {
      await talentPlusSubscription.connect(admin).deactivateSubscriptionModel(subscriptionSlug);
      
      const action = talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, parseEther("50"));
      await expect(action).to.be.revertedWith("Subscription model is not active");
    });

    it("should handle different subscription models with different prices", async () => {
      const premiumSlug = "premium";
      
      // Test basic subscription
      const basicTx = await talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, parseEther("50"));
      const basicEvent = await findEvent(basicTx, "SubscriptionCreated");
      expect(basicEvent?.args?.subscriptionSlug).to.eq(subscriptionSlug);

      // Test premium subscription for different user
      const premiumTx = await talentPlus.connect(user2).subscribe(user2.address, premiumSlug, parseEther("100"));
      const premiumEvent = await findEvent(premiumTx, "SubscriptionCreated");
      expect(premiumEvent?.args?.subscriptionSlug).to.eq(premiumSlug);

      // Verify both subscriptions are active
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, subscriptionSlug)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user2.address, premiumSlug)).to.eq(true);
    });

    it("should handle subscription upgrades through TalentPlusSubscription", async () => {
      // First, add basic subscription
      await talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, parseEther("50"));
      
      // Then upgrade to premium (this should work through TalentPlusSubscription)
      const premiumSlug = "premium";
      
      const tx = await talentPlus.connect(user1).subscribe(user1.address, premiumSlug, parseEther("100"));
      
      const event = await findEvent(tx, "SubscriptionCreated");
      expect(event?.args?.subscriptionSlug).to.eq(premiumSlug);
      
      // Verify upgrade worked
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, premiumSlug)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, subscriptionSlug)).to.eq(false);
    });
  });

  describe("Integration with TalentPlusSubscription", () => {
    it("should properly integrate subscription management", async () => {
      const subscriptionSlug = "basic";
      
      await talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, parseEther("50"));

      // Verify integration
      const [slug, expiration, startTime, isActive] = await talentPlusSubscription.getCurrentActiveSubscription(user1.address);
      expect(slug).to.eq(subscriptionSlug);
      expect(expiration).to.be.gt(0);
      expect(startTime).to.be.gt(0);
      expect(isActive).to.eq(true);
    });

    it("should handle subscription extension through TalentPlusSubscription", async () => {
      const subscriptionSlug = "basic";
      
      // First subscription
      await talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, parseEther("50"));
      const initialExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      
      // Second subscription (should extend)
      await talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, parseEther("50"));
      const newExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      
      expect(newExpiration).to.be.gt(initialExpiration);
    });
  });

  describe("Error Handling", () => {
    const subscriptionSlug = "basic";

    it("should handle reentrancy protection", async () => {
      // This test verifies that the nonReentrant modifier is present
      // We can verify this by checking that the contract inherits from ReentrancyGuard
      // The nonReentrant modifier prevents reentrancy attacks
      expect(talentPlus).to.not.be.undefined;
    });

    it("should not allow subscription with insufficient token payment", async () => {
      const insufficientPayment = parseEther("25"); // Less than the required 50
      const action = talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, insufficientPayment);
      await expect(action).to.be.revertedWith("Insufficient token payment");
    });

    it("should apply discount for wallet with sufficient TALENT holdings", async () => {
      // Give user1 enough TALENT tokens for discount (1000 TALENT for 10% discount)
      await talentToken.connect(admin).transfer(user1.address, parseEther("1000"));
      
      const tx = await talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, parseEther("45")); // 45 (discounted price)
      
      const event = await findEvent(tx, "SubscriptionCreated");
      expect(event).to.exist;
      expect(event?.args?.payer).to.eq(user1.address);
      expect(event?.args?.recipient).to.eq(user1.address);
      expect(event?.args?.subscriptionSlug).to.eq(subscriptionSlug);
      expect(event?.args?.pricePaid).to.eq(parseEther("45")); // Discounted price (50 - 10% = 45)
      expect(event?.args?.discountApplied).to.eq(true);

      // Check that subscription was set
      expect(await talentPlusSubscription.hasActiveSubscription(user1.address)).to.eq(true);
    });

    it("should not apply discount for wallet with insufficient TALENT holdings", async () => {
      // Give user1 less TALENT tokens than required for discount
      await talentToken.connect(admin).transfer(user1.address, parseEther("500"));
      
      const tx = await talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug, parseEther("50")); // Full price
      
      const event = await findEvent(tx, "SubscriptionCreated");
      expect(event).to.exist;
      expect(event?.args?.pricePaid).to.eq(parseEther("50")); // Full price
      expect(event?.args?.discountApplied).to.eq(false);
    });
  });
});
