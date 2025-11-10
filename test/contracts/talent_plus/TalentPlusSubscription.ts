import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TalentPlusSubscription, ERC20Mock } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { findEvent } from "../../shared/utils";
import { parseEther } from "ethers/lib/utils";

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
  let talentToken: ERC20Mock;
  let mockVault: any; // Mock vault contract

  beforeEach(async () => {
    [admin, user1, user2, trustedSigner, nonTrustedSigner] = await ethers.getSigners();
    
    // Deploy ERC20Mock as mock TALENT token
    talentToken = (await deployContract(admin, Artifacts.ERC20Mock, ["TalentProtocolToken", "TALENT"])) as ERC20Mock;
    
    // Deploy mock vault contract
    const mockVaultFactory = await ethers.getContractFactory("ERC20Mock");
    mockVault = await mockVaultFactory.deploy("MockVault", "VAULT");
    await mockVault.deployed();
    
    talentPlusSubscription = (await deployContract(admin, Artifacts.TalentPlusSubscription, [
      admin.address,
      talentToken.address,
      [mockVault.address],
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
        basicPrice,
        10, // 10% discount
        parseEther("1000") // 1000 TALENT tokens required for discount
      );
      
      const event = await findEvent(tx, "SubscriptionModelAdded");
      expect(event).to.exist;
      
      // Verify the subscription model was created correctly
      const model = await talentPlusSubscription.getSubscriptionModel(basicSlug);
      expect(model.durationInSeconds).to.eq(basicDuration);
      expect(model.price).to.eq(basicPrice);
      expect(model.discountPercentage).to.eq(10);
      expect(model.talentRequiredForDiscount).to.eq(parseEther("1000"));
      expect(model.active).to.eq(true);
    });

    it("should not allow duplicate subscription models", async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice, 10, parseEther("1000"));
      
      const action = talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice, 10, parseEther("1000"));
      await expect(action).to.be.revertedWith("Subscription model already exists");
    });

    it("should allow zero TALENT required for discount", async () => {
      const tx = await talentPlusSubscription.connect(admin).addSubscriptionModel(
        "test",
        basicDuration,
        basicPrice,
        10,
        0 // Zero should be allowed
      );
      
      const event = await findEvent(tx, "SubscriptionModelAdded");
      expect(event).to.exist;
      
      const model = await talentPlusSubscription.getSubscriptionModel("test");
      expect(model.talentRequiredForDiscount).to.eq(0);
    });

    it("should allow owner to update subscription model", async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice, 10, parseEther("1000"));
      
      const newDuration = 60 * 24 * 60 * 60; // 60 days
      const newPrice = ethers.utils.parseEther("75");
      
      const tx = await talentPlusSubscription.connect(admin).updateSubscriptionModel(
        basicSlug,
        newDuration,
        newPrice,
        15, // 15% discount
        parseEther("2000") // 2000 TALENT tokens required for discount
      );
      
      const event = await findEvent(tx, "SubscriptionModelUpdated");
      expect(event).to.exist;

      const model = await talentPlusSubscription.getSubscriptionModel(basicSlug);
      expect(model.durationInSeconds).to.eq(newDuration);
      expect(model.price).to.eq(newPrice);
      expect(model.discountPercentage).to.eq(15);
      expect(model.talentRequiredForDiscount).to.eq(parseEther("2000"));
      expect(model.active).to.eq(true);
    });

    it("should not allow updating non-existent subscription model", async () => {
      const action = talentPlusSubscription.connect(admin).updateSubscriptionModel(
        "nonexistent",
        basicDuration,
        basicPrice,
        10,
        parseEther("1000")
      );
      await expect(action).to.be.revertedWith("Subscription model does not exist");
    });


    it("should allow owner to deactivate subscription model", async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice, 10, parseEther("1000"));
      
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
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice, 10, parseEther("1000"));
      await talentPlusSubscription.connect(admin).addSubscriptionModel(premiumSlug, premiumDuration, premiumPrice, 20, parseEther("5000"));
      
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
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice, 10, parseEther("1000"));
      await talentPlusSubscription.connect(admin).addSubscriptionModel(premiumSlug, premiumDuration, premiumPrice, 20, parseEther("5000"));
    });

    it("should allow trusted signer to add user subscription", async () => {
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug, trustedSigner.address, 0);
      
      const event = await findEvent(tx, "UserSubscriptionAdded");
      expect(event).to.exist;

      expect(await talentPlusSubscription.hasActiveSubscription(user1.address)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, basicSlug)).to.eq(true);
    });

    it("should not allow non-trusted signer to add user subscription", async () => {
      const action = talentPlusSubscription.connect(nonTrustedSigner).addUserSubscription(user1.address, basicSlug, nonTrustedSigner.address, 0);
      await expect(action).to.be.revertedWith("Only trusted signers can add user subscriptions");
    });

    it("should not allow subscription for zero address", async () => {
      const action = talentPlusSubscription.connect(trustedSigner).addUserSubscription(ethers.constants.AddressZero, basicSlug, trustedSigner.address, 0);
      await expect(action).to.be.revertedWith("Invalid wallet address");
    });

    it("should not allow subscription for inactive model", async () => {
      await talentPlusSubscription.connect(admin).deactivateSubscriptionModel(basicSlug);
      
      const action = talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug, trustedSigner.address, 0);
      await expect(action).to.be.revertedWith("Subscription model is not active");
    });

    it("should allow upgrading subscription to higher tier", async () => {
      // Add basic subscription
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug, trustedSigner.address, 0);
      
      const initialExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      
      // Switch to premium (different subscription type - preserves remaining time + adds new duration)
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, premiumSlug, trustedSigner.address, 0);
      
      const event = await findEvent(tx, "UserSubscriptionExtended");
      expect(event).to.exist;

      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, premiumSlug)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, basicSlug)).to.eq(false);
      
      // New expiration should be greater than initial (remaining time + new duration)
      const newExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      expect(newExpiration).to.be.gt(initialExpiration);
    });

    it("should allow switching subscription types (preserves remaining time)", async () => {
      // Add premium subscription
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, premiumSlug, trustedSigner.address, 0);
      
      const initialExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      
      // Switch to basic (different subscription type - preserves remaining time + adds new duration)
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug, trustedSigner.address, 0);
      
      const event = await findEvent(tx, "UserSubscriptionExtended");
      expect(event).to.exist;
      
      // Should now have basic subscription
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, basicSlug)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, premiumSlug)).to.eq(false);
      
      // New expiration should be greater than initial (remaining time + new duration)
      const newExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      expect(newExpiration).to.be.gt(initialExpiration);
    });

    it("should extend subscription when same model is added", async () => {
      // Add basic subscription
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug, trustedSigner.address, 0);
      
      const initialExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      
      // Add same subscription again (should extend)
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug, trustedSigner.address, 0);
      
      const event = await findEvent(tx, "UserSubscriptionExtended");
      expect(event).to.exist;

      const newExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      expect(newExpiration).to.be.gt(initialExpiration);
    });

    it("should allow replacing expired subscription", async () => {
      // Add basic subscription
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug, trustedSigner.address, 0);
      
      // Fast forward time to expire the subscription
      const expirationTime = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      await ethers.provider.send("evm_setNextBlockTimestamp", [expirationTime.toNumber() + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Should be able to add any subscription now (subscription has expired, so it's a new subscription)
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, premiumSlug, trustedSigner.address, 0);
      
      const event = await findEvent(tx, "UserSubscriptionAdded");
      expect(event).to.exist;
      
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, premiumSlug)).to.eq(true);
    });
  });

  describe("User Subscription Management with Custom Expiration", () => {
    const basicSlug = "basic";
    const premiumSlug = "premium";
    const basicDuration = 30 * 24 * 60 * 60; // 30 days
    const premiumDuration = 90 * 24 * 60 * 60; // 90 days
    const basicPrice = ethers.utils.parseEther("50");
    const premiumPrice = ethers.utils.parseEther("100");

    beforeEach(async () => {
      await talentPlusSubscription.connect(admin).addSubscriptionModel(basicSlug, basicDuration, basicPrice, 10, parseEther("1000"));
      await talentPlusSubscription.connect(admin).addSubscriptionModel(premiumSlug, premiumDuration, premiumPrice, 20, parseEther("5000"));
    });

    it("should allow trusted signer to add user subscription with custom expiration", async () => {
      const customExpiration = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60; // 60 days from now
      
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscriptionWithExpiration(
        user1.address,
        customExpiration
      );
      
      const event = await findEvent(tx, "UserSubscriptionAdded");
      expect(event).to.exist;

      expect(await talentPlusSubscription.hasActiveSubscription(user1.address)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, "custom")).to.eq(true);
      
      const expiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      expect(expiration.toNumber()).to.be.closeTo(customExpiration, 60); // Allow 1 minute tolerance
    });

    it("should not allow non-trusted signer to add user subscription with custom expiration", async () => {
      const customExpiration = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60; // 60 days from now
      
      const action = talentPlusSubscription.connect(nonTrustedSigner).addUserSubscriptionWithExpiration(
        user1.address,
        customExpiration
      );
      await expect(action).to.be.revertedWith("Only trusted signers can add user subscriptions");
    });

    it("should not allow subscription for zero address with custom expiration", async () => {
      const customExpiration = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60; // 60 days from now
      
      const action = talentPlusSubscription.connect(trustedSigner).addUserSubscriptionWithExpiration(
        ethers.constants.AddressZero,
        customExpiration
      );
      await expect(action).to.be.revertedWith("Invalid wallet address");
    });

    it("should not allow expiration time in the past", async () => {
      const pastExpiration = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60; // 60 days ago
      
      const action = talentPlusSubscription.connect(trustedSigner).addUserSubscriptionWithExpiration(
        user1.address,
        pastExpiration
      );
      await expect(action).to.be.revertedWith("Expiration time must be in the future");
    });

    it("should replace existing subscription when adding with custom expiration", async () => {
      // First add a basic subscription
      await talentPlusSubscription.connect(trustedSigner).addUserSubscription(user1.address, basicSlug, trustedSigner.address, 0);
      
      // Then replace with custom subscription with custom expiration
      const customExpiration = Math.floor(Date.now() / 1000) + 120 * 24 * 60 * 60; // 120 days from now
      
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscriptionWithExpiration(
        user1.address,
        customExpiration
      );
      
      const event = await findEvent(tx, "UserSubscriptionExtended");
      expect(event).to.exist;

      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, "custom")).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, basicSlug)).to.eq(false);
      
      const expiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      expect(expiration.toNumber()).to.be.closeTo(customExpiration, 60); // Allow 1 minute tolerance
    });

        it("should allow setting subscription with expiration very close to current time", async () => {
            const currentBlockTime = (await ethers.provider.getBlock('latest')).timestamp;
            const nearFutureExpiration = currentBlockTime + 86400; // 1 day from current block time
      
      const tx = await talentPlusSubscription.connect(trustedSigner).addUserSubscriptionWithExpiration(
        user1.address,
        nearFutureExpiration
      );
      
      const event = await findEvent(tx, "UserSubscriptionAdded");
      expect(event).to.exist;

      expect(await talentPlusSubscription.hasActiveSubscription(user1.address)).to.eq(true);
      
      const expiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      expect(expiration.toNumber()).to.be.closeTo(nearFutureExpiration, 60); // Allow 1 minute tolerance
    });
  });

  describe("Discount Functionality", () => {
    const basicSlug = "basic";
    const basicDuration = 30 * 24 * 60 * 60; // 30 days in seconds
    const basicPrice = ethers.utils.parseEther("50");

    beforeEach(async () => {
      // Add subscription model with discount
      await talentPlusSubscription.connect(admin).addSubscriptionModel(
        basicSlug,
        basicDuration,
        basicPrice,
        20, // 20% discount
        parseEther("1000") // 1000 TALENT tokens required for discount
      );
    });

    it("should calculate correct discounted price for eligible wallet", async () => {
      // Give user1 enough TALENT tokens for discount
      await talentToken.connect(admin).transfer(user1.address, parseEther("1000"));
      
      const [finalPrice, discountApplied, discountAmount] = await talentPlusSubscription.calculateDiscountedPrice(basicSlug, user1.address);
      
      expect(discountApplied).to.be.true;
      expect(finalPrice).to.eq(parseEther("40")); // 50 ETH - 20% = 40 ETH
      expect(discountAmount).to.eq(parseEther("10")); // 20% discount = 10 ETH
    });

    it("should not apply discount for wallet with insufficient TALENT", async () => {
      // Give user1 less TALENT tokens than required
      await talentToken.connect(admin).transfer(user1.address, parseEther("500"));
      
      const [finalPrice, discountApplied, discountAmount] = await talentPlusSubscription.calculateDiscountedPrice(basicSlug, user1.address);
      
      expect(discountApplied).to.be.false;
      expect(finalPrice).to.eq(basicPrice); // Full price
      expect(discountAmount).to.eq(0); // No discount applied
    });

    it("should not apply discount for wallet with zero TALENT", async () => {
      const [finalPrice, discountApplied, discountAmount] = await talentPlusSubscription.calculateDiscountedPrice(basicSlug, user2.address);
      
      expect(discountApplied).to.be.false;
      expect(finalPrice).to.eq(basicPrice); // Full price
      expect(discountAmount).to.eq(0); // No discount applied
    });

    it("should handle 100% discount correctly", async () => {
      // Update subscription model to have 100% discount
      await talentPlusSubscription.connect(admin).updateSubscriptionModel(
        basicSlug,
        basicDuration,
        basicPrice,
        100, // 100% discount
        parseEther("1000")
      );
      
      // Give user1 enough TALENT tokens
      await talentToken.connect(admin).transfer(user1.address, parseEther("1000"));
      
      const [finalPrice, discountApplied, discountAmount] = await talentPlusSubscription.calculateDiscountedPrice(basicSlug, user1.address);
      
      expect(discountApplied).to.be.true;
      expect(finalPrice).to.eq(0); // Free subscription
      expect(discountAmount).to.eq(basicPrice); // Full discount = full price
    });

    it("should revert for inactive subscription model", async () => {
      await talentPlusSubscription.connect(admin).deactivateSubscriptionModel(basicSlug);
      
      const action = talentPlusSubscription.calculateDiscountedPrice(basicSlug, user1.address);
      await expect(action).to.be.revertedWith("Subscription model is not active");
    });

    it("should revert for invalid subscription slug", async () => {
      const action = talentPlusSubscription.calculateDiscountedPrice("nonexistent", user1.address);
      await expect(action).to.be.revertedWith("Subscription model is not active");
    });

    it("should revert for zero address", async () => {
      const action = talentPlusSubscription.calculateDiscountedPrice(basicSlug, ethers.constants.AddressZero);
      await expect(action).to.be.revertedWith("Invalid wallet address");
    });

    it("should apply discount based on vault staking alone", async () => {
      // Give user1 vault tokens (simulating staking) but no TALENT tokens
      await mockVault.connect(admin).transfer(user1.address, parseEther("1000"));
      
      const [finalPrice, discountApplied, discountAmount] = await talentPlusSubscription.calculateDiscountedPrice(basicSlug, user1.address);
      
      expect(discountApplied).to.be.true;
      expect(finalPrice).to.eq(parseEther("40")); // 50 ETH - 20% = 40 ETH
      expect(discountAmount).to.eq(parseEther("10")); // 20% discount = 10 ETH
    });

    it("should apply discount based on combined TALENT balance and vault staking", async () => {
      // Give user1 some TALENT tokens and some vault tokens
      await talentToken.connect(admin).transfer(user1.address, parseEther("500"));
      await mockVault.connect(admin).transfer(user1.address, parseEther("500"));
      // Total: 1000 TALENT equivalent (500 + 500)
      
      const [finalPrice, discountApplied, discountAmount] = await talentPlusSubscription.calculateDiscountedPrice(basicSlug, user1.address);
      
      expect(discountApplied).to.be.true;
      expect(finalPrice).to.eq(parseEther("40")); // 50 ETH - 20% = 40 ETH
      expect(discountAmount).to.eq(parseEther("10")); // 20% discount = 10 ETH
    });

    it("should not apply discount when combined holdings are insufficient", async () => {
      // Give user1 some TALENT tokens and some vault tokens, but not enough combined
      await talentToken.connect(admin).transfer(user1.address, parseEther("300"));
      await mockVault.connect(admin).transfer(user1.address, parseEther("200"));
      // Total: 500 TALENT equivalent (300 + 200), but need 1000
      
      const [finalPrice, discountApplied, discountAmount] = await talentPlusSubscription.calculateDiscountedPrice(basicSlug, user1.address);
      
      expect(discountApplied).to.be.false;
      expect(finalPrice).to.eq(basicPrice); // Full price
      expect(discountAmount).to.eq(0); // No discount applied
    });
  });
});
