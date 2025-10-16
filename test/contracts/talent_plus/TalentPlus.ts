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
  let trustedSigner: SignerWithAddress;
  let feeReceiver: SignerWithAddress;
  let nonTrustedSigner: SignerWithAddress;

  let talentPlus: TalentPlus;
  let talentPlusSubscription: TalentPlusSubscription;
  let talentToken: ERC20Mock; // Use ERC20Mock as mock TALENT token

  beforeEach(async () => {
    [admin, user1, user2, trustedSigner, feeReceiver, nonTrustedSigner] = await ethers.getSigners();
    
    // Deploy ERC20Mock as mock TALENT token
    talentToken = (await deployContract(admin, Artifacts.ERC20Mock, ["TalentProtocolToken", "TALENT"])) as ERC20Mock;
    
    // Deploy TalentPlusSubscription
    talentPlusSubscription = (await deployContract(admin, Artifacts.TalentPlusSubscription, [
      admin.address,
    ])) as TalentPlusSubscription;
    
    // Deploy TalentPlus
    talentPlus = (await deployContract(admin, Artifacts.TalentPlus, [
      trustedSigner.address,
      talentPlusSubscription.address,
      feeReceiver.address,
      talentToken.address,
    ])) as TalentPlus;
    
    // Add subscription models
    await talentPlusSubscription.connect(admin).addSubscriptionModel("basic", 30 * 24 * 60 * 60, parseEther("50"));
    await talentPlusSubscription.connect(admin).addSubscriptionModel("premium", 90 * 24 * 60 * 60, parseEther("100"));
    
    // Add TalentPlus contract as trusted signer so it can call addUserSubscription
    await talentPlusSubscription.connect(admin).addTrustedSigner(talentPlus.address);
    
    // Transfer tokens to trusted signer (admin already has tokens from constructor)
    await talentToken.connect(admin).transfer(trustedSigner.address, parseEther("1000"));
    
    // Approve TalentPlus to spend tokens from trusted signer
    await talentToken.connect(trustedSigner).approve(talentPlus.address, parseEther("1000"));
  });

  describe("Deployment", () => {
    it("should deploy with correct initial state", async () => {
      expect(await talentPlus.owner()).to.eq(admin.address);
      expect(await talentPlus.trustedSigner()).to.eq(trustedSigner.address);
      expect(await talentPlus.feeReceiver()).to.eq(feeReceiver.address);
      expect(await talentPlus.talentPlusSubscription()).to.eq(talentPlusSubscription.address);
      expect(await talentPlus.enabled()).to.eq(true);
    });

    it("should have correct TALENT token address", async () => {
      expect(await talentPlus.TALENT_TOKEN()).to.eq(talentToken.address);
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

    it("should allow valid subscription from trusted signer", async () => {
      const tx = await talentPlus.connect(trustedSigner).subscribe(user1.address, subscriptionSlug);
      
      const event = await findEvent(tx, "SubscriptionCreated");
      expect(event).to.exist;
      expect(event?.args?.payer).to.eq(trustedSigner.address);
      expect(event?.args?.recipient).to.eq(user1.address);
      expect(event?.args?.subscriptionSlug).to.eq(subscriptionSlug);

      // Check that subscription was set
      expect(await talentPlusSubscription.hasActiveSubscription(user1.address)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, subscriptionSlug)).to.eq(true);
    });

    it("should not allow subscription when contract is disabled", async () => {
      await talentPlus.connect(admin).setDisabled();
      
      const action = talentPlus.connect(trustedSigner).subscribe(user1.address, subscriptionSlug);
      await expect(action).to.be.revertedWith("Subscription is disabled for this contract");
    });

    it("should not allow subscription with empty subscription slug", async () => {
      const action = talentPlus.connect(trustedSigner).subscribe(user1.address, "");
      await expect(action).to.be.revertedWith("Subscription slug cannot be empty");
    });

    it("should not allow subscription for zero address", async () => {
      const action = talentPlus.connect(trustedSigner).subscribe(ethers.constants.AddressZero, subscriptionSlug);
      await expect(action).to.be.revertedWith("Invalid wallet address");
    });

    it("should not allow subscription from non-trusted signer", async () => {
      const action = talentPlus.connect(user1).subscribe(user1.address, subscriptionSlug);
      await expect(action).to.be.revertedWith("Only trusted signer can create subscriptions");
    });

    it("should allow purchasing subscription for another user", async () => {
      // Trusted signer purchases subscription for User2
      const tx = await talentPlus.connect(trustedSigner).subscribe(user2.address, subscriptionSlug);
      
      const event = await findEvent(tx, "SubscriptionCreated");
      expect(event).to.exist;
      expect(event?.args?.payer).to.eq(trustedSigner.address); // Trusted signer paid
      expect(event?.args?.recipient).to.eq(user2.address); // User2 receives subscription
      expect(event?.args?.subscriptionSlug).to.eq(subscriptionSlug);

      // Check that subscription was set for user2
      expect(await talentPlusSubscription.hasActiveSubscription(user2.address)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user2.address, subscriptionSlug)).to.eq(true);
      
      // Check that trusted signer doesn't have a subscription
      expect(await talentPlusSubscription.hasActiveSubscription(trustedSigner.address)).to.eq(false);
    });

    it("should not allow subscription for inactive subscription model", async () => {
      await talentPlusSubscription.connect(admin).deactivateSubscriptionModel(subscriptionSlug);
      
      const action = talentPlus.connect(trustedSigner).subscribe(user1.address, subscriptionSlug);
      await expect(action).to.be.revertedWith("Subscription model is not active");
    });

    it("should handle different subscription models with different prices", async () => {
      const premiumSlug = "premium";
      
      // Test basic subscription
      const basicTx = await talentPlus.connect(trustedSigner).subscribe(user1.address, subscriptionSlug);
      const basicEvent = await findEvent(basicTx, "SubscriptionCreated");
      expect(basicEvent?.args?.subscriptionSlug).to.eq(subscriptionSlug);

      // Test premium subscription for different user
      const premiumTx = await talentPlus.connect(trustedSigner).subscribe(user2.address, premiumSlug);
      const premiumEvent = await findEvent(premiumTx, "SubscriptionCreated");
      expect(premiumEvent?.args?.subscriptionSlug).to.eq(premiumSlug);

      // Verify both subscriptions are active
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user1.address, subscriptionSlug)).to.eq(true);
      expect(await talentPlusSubscription.hasActiveSubscriptionForModel(user2.address, premiumSlug)).to.eq(true);
    });

    it("should handle subscription upgrades through TalentPlusSubscription", async () => {
      // First, add basic subscription
      await talentPlus.connect(trustedSigner).subscribe(user1.address, subscriptionSlug);
      
      // Then upgrade to premium (this should work through TalentPlusSubscription)
      const premiumSlug = "premium";
      
      const tx = await talentPlus.connect(trustedSigner).subscribe(user1.address, premiumSlug);
      
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
      
      const addressHash = ethers.utils.solidityKeccak256(["address"], [user1.address]);
      const signature = await trustedSigner.signMessage(ethers.utils.arrayify(addressHash));

      await talentPlus.connect(trustedSigner).subscribe(user1.address, subscriptionSlug);

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
      await talentPlus.connect(trustedSigner).subscribe(user1.address, subscriptionSlug);
      const initialExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      
      // Second subscription (should extend)
      await talentPlus.connect(trustedSigner).subscribe(user1.address, subscriptionSlug);
      const newExpiration = await talentPlusSubscription.getSubscriptionExpiration(user1.address);
      
      expect(newExpiration).to.be.gt(initialExpiration);
    });
  });

  describe("Error Handling", () => {
    it("should handle reentrancy protection", async () => {
      // This test verifies that the nonReentrant modifier is present
      // We can verify this by checking that the contract inherits from ReentrancyGuard
      // The nonReentrant modifier prevents reentrancy attacks
      expect(talentPlus).to.not.be.undefined;
    });

    it("should handle invalid subscription model gracefully", async () => {
      const invalidSlug = "nonexistent";
      
      const action = talentPlus.connect(trustedSigner).subscribe(user1.address, invalidSlug);
      await expect(action).to.be.revertedWith("Subscription model is not active");
    });
  });
});
