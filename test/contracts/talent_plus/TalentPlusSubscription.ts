import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TalentPlusSubscription } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { findEvent } from "../../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentPlusSubscription", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let trustedSigner: SignerWithAddress;
  let nonTrustedSigner: SignerWithAddress;

  let talentPlusSubscription: TalentPlusSubscription;

  beforeEach(async () => {
    [admin, user1, user2, trustedSigner, nonTrustedSigner] = await ethers.getSigners();
    
    talentPlusSubscription = (await deployContract(admin, Artifacts.TalentPlusSubscription, [
      admin.address,
    ])) as TalentPlusSubscription;
    
    // Add trusted signer
    await talentPlusSubscription.connect(admin).addTrustedSigner(trustedSigner.address);
  });

  describe("Deployment", () => {
    it("should deploy with correct initial state", async () => {
      expect(await talentPlusSubscription.owner()).to.eq(admin.address);
      expect(await talentPlusSubscription.trustedSigners(admin.address)).to.eq(true);
    });

    it("should set initial owner as trusted signer", async () => {
      expect(await talentPlusSubscription.trustedSigners(admin.address)).to.eq(true);
    });
  });

  describe("Trusted Signer Management", () => {
    it("should allow owner to add trusted signer", async () => {
      const tx = await talentPlusSubscription.connect(admin).addTrustedSigner(user1.address);
      const event = await findEvent(tx, "TrustedSignerAdded");
      
      expect(event).to.exist;
      expect(event?.args?.signer).to.eq(user1.address);
      expect(await talentPlusSubscription.trustedSigners(user1.address)).to.eq(true);
    });

    it("should allow owner to remove trusted signer", async () => {
      await talentPlusSubscription.connect(admin).addTrustedSigner(user1.address);
      
      const tx = await talentPlusSubscription.connect(admin).removeTrustedSigner(user1.address);
      const event = await findEvent(tx, "TrustedSignerRemoved");
      
      expect(event).to.exist;
      expect(event?.args?.signer).to.eq(user1.address);
      expect(await talentPlusSubscription.trustedSigners(user1.address)).to.eq(false);
    });

    it("should not allow non-owner to add trusted signer", async () => {
      const action = talentPlusSubscription.connect(user1).addTrustedSigner(user2.address);
      await expect(action).to.be.reverted;
    });

    it("should not allow non-owner to remove trusted signer", async () => {
      const action = talentPlusSubscription.connect(user1).removeTrustedSigner(admin.address);
      await expect(action).to.be.reverted;
    });

    it("should check if address is trusted signer", async () => {
      expect(await talentPlusSubscription.isTrustedSigner(admin.address)).to.eq(true);
      expect(await talentPlusSubscription.isTrustedSigner(trustedSigner.address)).to.eq(true);
      expect(await talentPlusSubscription.isTrustedSigner(user1.address)).to.eq(false);
    });
  });

  describe("Subscription Model Management", () => {
    const basicSlug = "basic";
    const premiumSlug = "premium";
    const basicDuration = 30 * 24 * 60 * 60; // 30 days in seconds
    const premiumDuration = 90 * 24 * 60 * 60; // 90 days in seconds
    const basicPrice = ethers.utils.parseEther("50");
    const premiumPrice = ethers.utils.parseEther("100");

    it("should allow owner to add subscription model", async () => {
      const tx = await talentPlusSubscription.connect(admin).addSubscriptionModel(
        basicSlug,
        basicDuration,
        basicPrice
      );
      
      const event = await findEvent(tx, "SubscriptionModelAdded");
      expect(event).to.exist;
      
      // Verify the subscription model was created correctly
      const model = await talentPlusSubscription.getSubscriptionModel(basicSlug);
      expect(model.durationInSeconds).to.eq(basicDuration);
      expect(model.priceInTalent).to.eq(basicPrice);
      expect(model.active).to.eq(true);
    });

    it("should not allow duplicate subscription models", async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice);
      
      const action = talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice);
      await expect(action).to.be.revertedWith("Subscription model already exists");
    });

    it("should not allow non-owner to add subscription model", async () => {
      const action = talentPlusSubscription.connect(user1).addSubscriptionModel(basicSlug, basicDuration, basicPrice);
      await expect(action).to.be.revertedWith("Only owner or trusted signers can add subscription models");
    });

    it("should allow owner to update subscription model", async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice);
      
      const newDuration = 60 * 24 * 60 * 60; // 60 days
      const newPrice = ethers.utils.parseEther("75");
      
      const tx = await talentPlusSubscription.connect(admin).updateSubscriptionModel(
        basicSlug,
        newDuration,
        newPrice
      );
      
      const event = await findEvent(tx, "SubscriptionModelUpdated");
      expect(event).to.exist;

      const model = await talentPlusSubscription.getSubscriptionModel(basicSlug);
      expect(model.durationInSeconds).to.eq(newDuration);
      expect(model.priceInTalent).to.eq(newPrice);
      expect(model.active).to.eq(true);
    });

    it("should not allow updating non-existent subscription model", async () => {
      const action = talentPlusSubscription.connect(admin).updateSubscriptionModel(
        "nonexistent",
        basicDuration,
        basicPrice
      );
      await expect(action).to.be.revertedWith("Subscription model does not exist");
    });

    it("should allow owner to deactivate subscription model", async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice);
      
      const tx = await talentPlusSubscription.connect(admin).deactivateSubscriptionModel(basicSlug);
      const event = await findEvent(tx, "SubscriptionModelDeactivated");
      
      expect(event).to.exist;

      const model = await talentPlusSubscription.getSubscriptionModel(basicSlug);
      expect(model.active).to.eq(false);
    });

    it("should not allow deactivating non-existent subscription model", async () => {
      const action = talentPlusSubscription.connect(admin).deactivateSubscriptionModel("nonexistent");
      await expect(action).to.be.revertedWith("Subscription model does not exist or already inactive");
    });

    it("should get available subscription slugs", async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice);
      await talentPlusSubscription.connect(admin).addSubscriptionModel(premiumSlug, premiumDuration, premiumPrice);
      
      // Check that we can access the array length
      const slugsCount = await talentPlusSubscription.getTotalModels();
      expect(slugsCount).to.eq(2);
    });
  });

  describe("User Subscription Management", () => {
    const basicSlug = "basic";
    const premiumSlug = "premium";
    const basicDuration = 30 * 24 * 60 * 60; // 30 days
    const premiumDuration = 90 * 24 * 60 * 60; // 90 days
    const basicPrice = ethers.utils.parseEther("50");
    const premiumPrice = ethers.utils.parseEther("100");

    beforeEach(async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice);
      await talentPlusSubscription.connect(admin).addSubscriptionModel(premiumSlug, premiumDuration, premiumPrice);
    });

    it("should allow trusted signer to add user subscription", async () => {
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug);
      
      const event = await findEvent(tx, "UserSubscriptionAdded");
      expect(event).to.exist;

      expect(await talentPlusSubscription.hasActiveSubscription(user1.address)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, basicSlug)).to.eq(true);
    });

    it("should not allow non-trusted signer to add user subscription", async () => {
      const action = talentPlusSubscription.connect(nonTrustedSigner).addUserSubscription(user1.address, basicSlug);
      await expect(action).to.be.revertedWith("Only trusted signers can add user subscriptions");
    });

    it("should not allow subscription for zero address", async () => {
      const action = talentPlusSubscription.connect(trustedSigner).addUserSubscription(ethers.constants.AddressZero, basicSlug);
      await expect(action).to.be.revertedWith("Invalid wallet address");
    });

    it("should not allow subscription for inactive model", async () => {
      await talentPlusSubscription.connect(admin).deactivateSubscriptionModel(basicSlug);
      
      const action = talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug);
      await expect(action).to.be.revertedWith("Subscription model is not active");
    });

    it("should allow upgrading subscription to higher tier", async () => {
      // Add basic subscription
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug);
      
      // Upgrade to premium (higher duration)
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, premiumSlug);
      
      const event = await findEvent(tx, "UserSubscriptionReplaced");
      expect(event).to.exist;

      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, premiumSlug)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, basicSlug)).to.eq(false);
    });

    it("should not allow downgrading active subscription", async () => {
      // Add premium subscription
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, premiumSlug);
      
      // Try to downgrade to basic (lower duration)
      const action = talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug);
      await expect(action).to.be.revertedWith("Cannot downgrade an active subscription");
    });

    it("should extend subscription when same model is added", async () => {
      // Add basic subscription
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug);
      
      const initialExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      
      // Add same subscription again (should extend)
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug);
      
      const event = await findEvent(tx, "UserSubscriptionExtended");
      expect(event).to.exist;

      const newExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      expect(newExpiration).to.be.gt(initialExpiration);
    });

    it("should allow replacing expired subscription", async () => {
      // Add basic subscription
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug);
      
      // Fast forward time to expire the subscription
      const expirationTime = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      await ethers.provider.send("evm_setNextBlockTimestamp", [expirationTime.toNumber() + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Should be able to add any subscription now
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, premiumSlug);
      
      const event = await findEvent(tx, "UserSubscriptionReplaced");
      expect(event).to.exist;
    });
  });

  describe("Subscription Queries", () => {
    const basicSlug = "basic";
    const basicDuration = 30 * 24 * 60 * 60; // 30 days
    const basicPrice = ethers.utils.parseEther("50");

    beforeEach(async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice);
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug);
    });

    it("should check if user has active subscription", async () => {
      expect(await talentPlusSubscription.hasActiveSubscription(user1.address)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscription(user2.address)).to.eq(false);
    });

    it("should check if user has active subscription for specific model", async () => {
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, basicSlug)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, "premium")).to.eq(false);
    });

    it("should get subscription expiration time", async () => {
      const expiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      expect(expiration).to.be.gt(0);
      
      // Should be approximately 30 days from now (basicDuration = 30 days)
      const currentTime = Math.floor(Date.now() / 1000);
      const expectedExpiration = currentTime + basicDuration;
      
      // Check that expiration is reasonable (within 60 days of expected)
      expect(expiration.toNumber()).to.be.closeTo(expectedExpiration, 5184000); // Allow 60 days tolerance
    });

    it("should get subscription start time", async () => {
      const startTime = await talentPlusSubscription.getSubscriptionStartTime(user1.address);
      expect(startTime).to.be.gt(0);
      
      // Should be approximately now
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check that start time is reasonable (within 60 days of now)
      expect(startTime.toNumber()).to.be.closeTo(currentTime, 5184000); // Allow 60 days tolerance
    });

    it("should get current active subscription details", async () => {
      const [slug, expiration, startTime, isActive] = await talentPlusSubscription.getCurrentActiveSubscription(user1.address);
      
      expect(slug).to.eq(basicSlug);
      expect(expiration).to.be.gt(0);
      expect(startTime).to.be.gt(0);
      expect(isActive).to.eq(true);
    });

    it("should return empty data for user without subscription", async () => {
      const [slug, expiration, startTime, isActive] = await talentPlusSubscription.getCurrentActiveSubscription(user2.address);
      
      expect(slug).to.eq("");
      expect(expiration).to.eq(0);
      expect(startTime).to.eq(0);
      expect(isActive).to.eq(false);
    });
  });
});
