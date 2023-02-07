import chai from "chai";
import { ethers, waffle } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TestResolver, TalSubdomainRegistrar } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { findEvent } from "../../shared/utils";

const { expect } = chai;
const { deployContract } = waffle;
const { parseUnits } = ethers.utils;

const packet = require("dns-packet");
const nameHash = require("eth-ens-namehash");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("SubdomainRegistrar", function () {
  const hexEncodeName = (name: String) => "0x" + packet.name.encode(name).toString("hex");

  const hexEncodeTXT = (keys: any) => "0x" + packet.answer.encode(keys).toString("hex");

  let ensOwner: SignerWithAddress;
  let registrarOwner: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;

  let ens: any;
  let dnsRegistrar: any;
  let subdomainRegistrar: TalSubdomainRegistrar;
  let resolver: TestResolver;
  let priceFeed: any;
  let dnssec: any;
  let root: any;

  const label = "test";
  const domain = `${label}.community`;
  const node = nameHash.hash(domain);

  const ethPriceUSD = 1500;
  // Returns price with 8 decimals
  const ethUsdPriceFeed = ethPriceUSD * 10 ** 8;

  const defaultFeeUSD = 8;
  const subdomainPriceInEth = parseUnits((defaultFeeUSD / ethPriceUSD).toString());

  before(async function () {
    [ensOwner, registrarOwner, account1, account2] = await ethers.getSigners();

    await builder();
  });

  const builder = async () => {
    priceFeed = await deployContract(ensOwner, Artifacts.TestPriceFeed, [ethUsdPriceFeed]);
    ens = await deployContract(ensOwner, Artifacts.ENSRegistry, []);
    root = await deployContract(ensOwner, Artifacts.ENSRoot, [ens.address]);
    await ens.setOwner(nameHash.hash(0x0), root.address);
    resolver = (await deployContract(ensOwner, Artifacts.TestResolver, [])) as TestResolver;
    dnssec = await deployContract(ensOwner, Artifacts.TestDNSSEC, []);
    const suffixes = await deployContract(ensOwner, Artifacts.SimplePublicSuffixList, []);
    await suffixes.addPublicSuffixes([hexEncodeName("com"), hexEncodeName("community")]);
    dnsRegistrar = await deployContract(ensOwner, Artifacts.DnsRegistrar, [
      dnssec.address,
      suffixes.address,
      ens.address,
    ]);
    await root.setController(dnsRegistrar.address, true);

    subdomainRegistrar = (await deployContract(registrarOwner, Artifacts.TalSubdomainRegistrar, [
      ens.address,
      resolver.address,
      dnsRegistrar.address,
      priceFeed.address,
      node,
      registrarOwner.address,
      defaultFeeUSD,
    ])) as TalSubdomainRegistrar;
  };

  const claimDNS = async () => {
    const proof = hexEncodeTXT({
      name: `_ens.${domain}`,
      type: "TXT",
      class: "IN",
      ttl: 3600,
      data: ["a=" + subdomainRegistrar.address],
    });

    const now = Math.round(new Date().getTime() / 1000);
    const oneYearFromNow = Math.round(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).getTime() / 1000);
    await dnssec.setData(16, hexEncodeName(`_ens.${domain}`), now, oneYearFromNow, proof);

    await subdomainRegistrar.configureDnsOwnership(hexEncodeName(domain), [{ rrset: proof, sig: "0x" }], proof);
  };

  it("validates if the contract can be deployed", async () => {
    expect(subdomainRegistrar.address).not.to.be.equal(ZERO_ADDRESS);
  });

  it("sets the correct owner on the subdomain registrar", async () => {
    expect(await subdomainRegistrar.owner()).to.be.equal(registrarOwner.address);
  });

  it("allows the contract owner to claim the DNS record he owns", async () => {
    const proof = hexEncodeTXT({
      name: `_ens.${domain}`,
      type: "TXT",
      class: "IN",
      ttl: 3600,
      data: ["a=" + subdomainRegistrar.address],
    });

    const now = Math.round(new Date().getTime() / 1000);
    const oneYearFromNow = Math.round(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).getTime() / 1000);
    await dnssec.setData(16, hexEncodeName(`_ens.${domain}`), now, oneYearFromNow, proof);

    await subdomainRegistrar.configureDnsOwnership(hexEncodeName(domain), [{ rrset: proof, sig: "0x" }], proof);

    expect(await ens.owner(nameHash.hash(domain))).to.be.equal(subdomainRegistrar.address);
    expect(await ens.resolver(nameHash.hash(domain))).to.be.equal(resolver.address);
  });

  describe("testing subdomain payable register", () => {
    beforeEach(async () => {
      await claimDNS();
    });

    it("allows someone to register a subdomain not taken", async () => {
      const subDomain = "dinis";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(account1).register(subDomain, { value: subdomainPriceInEth });

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);
    });

    it("charges the correct amounts when someone registers a subdomain", async () => {
      const subDomain = "leal";

      const buyerPreviousBalance = await ethers.provider.getBalance(account1.address);
      const ownerPreviousBalance = await ethers.provider.getBalance(registrarOwner.address);

      const tx = await subdomainRegistrar.connect(account1).register(subDomain, { value: subdomainPriceInEth });

      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const amountSpent = subdomainPriceInEth.add(gasSpent);

      const buyerUpdatedBalance = await ethers.provider.getBalance(account1.address);
      expect(buyerUpdatedBalance).to.be.equal(buyerPreviousBalance.sub(amountSpent));

      const ownerUpdatedBalance = await ethers.provider.getBalance(registrarOwner.address);
      expect(ownerUpdatedBalance).to.be.equal(ownerPreviousBalance.add(subdomainPriceInEth));
    });

    it("emits a SubDomainRegistered event when someone registers a subdomain", async () => {
      const subDomain = "verdefred";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      const tx = await subdomainRegistrar.connect(account1).register(subDomain, { value: subdomainPriceInEth });

      const event = await findEvent(tx, "SubDomainRegistered");

      expect(event?.args?.subDomainLabel).to.eq(subDomain);
      expect(event?.args?.price).to.be.eq(subdomainPriceInEth);
      expect(event?.args?.owner).to.be.eq(account1.address);
    });

    it("prevents someone to register a subdomain already taken", async () => {
      const subDomain = "test";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(account1).register(subDomain, { value: subdomainPriceInEth });

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);

      const action = subdomainRegistrar.connect(account2).register(subDomain, { value: subdomainPriceInEth });

      await expect(action).to.be.revertedWith("TALSUBDOMAIN_REGISTRAR: SUBDOMAIN_ALREADY_REGISTERED");
    });

    it("prevents someone to register a subdomain when the amount passed is not enough", async () => {
      const subDomain = "guedes";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      const amountPassed = subdomainPriceInEth.sub(parseUnits("0.0001"));
      const action = subdomainRegistrar.connect(account1).register(subDomain, { value: amountPassed });

      await expect(action).to.be.revertedWith("TALSUBDOMAIN_REGISTRAR: Amount passed is not enough");

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);
    });

    it("prevents someone to register a subdomain when the contract is stopped", async () => {
      const subDomain = "pcbo";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(registrarOwner).stop();

      const action = subdomainRegistrar.connect(account1).register(subDomain, { value: subdomainPriceInEth });

      await expect(action).to.be.revertedWith("TALSUBDOMAIN_REGISTRAR: Contract is currently stopped.");

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);
    });
  });

  describe("testing subdomain free register", () => {
    beforeEach(async () => {
      await claimDNS();
      await subdomainRegistrar.connect(registrarOwner).open();
    });

    it("allows the owner to register a subdomain not taken for free", async () => {
      const subDomain = "freedinis";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account1.address);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);
    });

    it("allows the owner to register a subdomain not taken for free even if the contract is stopped", async () => {
      await subdomainRegistrar.connect(registrarOwner).stop();

      const subDomain = "freestopped";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account1.address);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);
    });

    it("emits a SubDomainRegistered event when a free domain is registered", async () => {
      const subDomain = "freeverdefred";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      const tx = await subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account2.address);

      const event = await findEvent(tx, "SubDomainRegistered");

      expect(event?.args?.subDomainLabel).to.eq(subDomain);
      expect(event?.args?.price).to.be.eq(0);
      expect(event?.args?.owner).to.be.eq(account2.address);
    });

    it("prevents register a subdomain already taken for free", async () => {
      const subDomain = "freetaken";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account1.address);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);

      const action = subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account2.address);

      await expect(action).to.be.revertedWith("TALSUBDOMAIN_REGISTRAR: SUBDOMAIN_ALREADY_REGISTERED");
    });

    it("only allow the owner to register a subdomain for free", async () => {
      const subDomain = "freenotowner";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      const action = subdomainRegistrar.connect(account1).freeRegister(subDomain, account2.address);

      await expect(action).to.be.reverted;

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);
    });
  });

  describe("testing subdomain revoke", () => {
    beforeEach(async () => {
      await claimDNS();
      await subdomainRegistrar.connect(registrarOwner).open();
    });

    it("allows the owner to revoke a registered subdomain", async () => {
      const subDomain = "registered";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account1.address);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);

      await subdomainRegistrar.connect(registrarOwner).revokeSubdomain(subDomain);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);
    });

    it("allows the owner to revoke a subdomain even if the contract is stopped", async () => {
      await subdomainRegistrar.connect(registrarOwner).stop();

      const subDomain = "stoppedregistered";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account1.address);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);

      await subdomainRegistrar.connect(registrarOwner).revokeSubdomain(subDomain);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);
    });

    it("allows the owner to register a revoked subdomain", async () => {
      const subDomain = "revokedregistered";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account1.address);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);

      await subdomainRegistrar.connect(registrarOwner).revokeSubdomain(subDomain);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account1.address);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);
    });

    it("prevents revoke a subdomain not registered", async () => {
      const subDomain = "notregistered";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      const action = subdomainRegistrar.connect(registrarOwner).revokeSubdomain(subDomain);

      await expect(action).to.be.revertedWith("TALSUBDOMAIN_REGISTRAR: SUBDOMAIN_NOT_REGISTERED");
    });

    it("only allow the owner to revoke a subdomain", async () => {
      const subDomain = "registerednotowner";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      await subdomainRegistrar.connect(registrarOwner).freeRegister(subDomain, account1.address);

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);

      const action = subdomainRegistrar.connect(account1).revokeSubdomain(subDomain);

      await expect(action).to.be.reverted;

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);
    });
  });

  describe("testing subdomain price change", () => {
    it("allows the registrar owner to change the subdomains price", async () => {
      const newFee = parseUnits("10");
      expect(await subdomainRegistrar.subdomainFee()).to.be.equal(defaultFeeUSD);

      await subdomainRegistrar.connect(registrarOwner).setSubdomainFee(newFee);

      expect(await subdomainRegistrar.subdomainFee()).to.be.equal(newFee);
    });

    it("triggers a SubDomainFeeChanged event when the subdomains price change", async () => {
      const newFee = parseUnits("15");

      const tx = await subdomainRegistrar.connect(registrarOwner).setSubdomainFee(newFee);
      const event = await findEvent(tx, "SubDomainFeeChanged");
      expect(event?.args?.newFee).to.eq(newFee);
    });

    it("prevents other accounts to change the subdomain price", async () => {
      const newFee = parseUnits("12");
      const currentFee = await subdomainRegistrar.subdomainFee();

      const action = subdomainRegistrar.connect(account1).setSubdomainFee(newFee);

      await expect(action).to.be.reverted;

      expect(await subdomainRegistrar.subdomainFee()).to.be.equal(currentFee);
    });

    it("prevents to change the subdomain price to the same existing price", async () => {
      const currentFee = await subdomainRegistrar.subdomainFee();

      const action = subdomainRegistrar.connect(registrarOwner).setSubdomainFee(currentFee);

      await expect(action).to.be.revertedWith("TALSUBDOMAIN_REGISTRAR: New fee matches the current fee");

      expect(await subdomainRegistrar.subdomainFee()).to.be.equal(currentFee);
    });
  });

  describe("testing resolver change", () => {
    it("allows the registrar owner to change the resolver", async () => {
      const newResolver = (await deployContract(ensOwner, Artifacts.TestResolver, [])) as TestResolver;

      expect(await subdomainRegistrar.publicResolver()).to.be.equal(resolver.address);

      await subdomainRegistrar.setPublicResolver(newResolver.address);

      expect(await subdomainRegistrar.publicResolver()).to.be.equal(newResolver.address);
    });

    it("prevents other accounts to change the subdomain price", async () => {
      const newResolver = (await deployContract(ensOwner, Artifacts.TestResolver, [])) as TestResolver;

      const currentResolver = await subdomainRegistrar.publicResolver();

      const action = subdomainRegistrar.connect(account1).setPublicResolver(newResolver.address);

      await expect(action).to.be.reverted;

      expect(await subdomainRegistrar.publicResolver()).to.be.equal(currentResolver);
    });
  });

  describe("testing contract stop and open", () => {
    beforeEach(async () => {
      await openSubdomainRegistrar();
    });

    const openSubdomainRegistrar = async () => {
      await subdomainRegistrar.connect(registrarOwner).open();
    };

    it("allows the registrar owner to stop and open the contract", async () => {
      expect(await subdomainRegistrar.stopped()).to.be.equal(false);

      await subdomainRegistrar.connect(registrarOwner).stop();

      expect(await subdomainRegistrar.stopped()).to.be.equal(true);

      await subdomainRegistrar.connect(registrarOwner).open();

      expect(await subdomainRegistrar.stopped()).to.be.equal(false);
    });

    it("prevents other accounts to stop the contract", async () => {
      expect(await subdomainRegistrar.stopped()).to.be.equal(false);

      const action = subdomainRegistrar.connect(account2).stop();

      await expect(action).to.be.reverted;

      expect(await subdomainRegistrar.stopped()).to.be.equal(false);
    });

    it("prevents other accounts to open the contract", async () => {
      const action = subdomainRegistrar.connect(account2).open();

      await expect(action).to.be.reverted;
    });

    it("prevents stop when the contract is already stopped", async () => {
      expect(await subdomainRegistrar.stopped()).to.be.equal(false);

      const action = subdomainRegistrar.connect(account2).stop();

      await expect(action).to.be.reverted;
    });
  });

  describe("testing contract ownership transfer", () => {
    beforeEach(async () => {
      await claimDNS();
    });

    it("allows the registrar owner to transfer the domain ownership to another account", async () => {
      expect(await ens.owner(nameHash.hash(domain))).to.be.equal(subdomainRegistrar.address);

      await subdomainRegistrar.connect(registrarOwner).transferDomainOwnership(account2.address);

      expect(await ens.owner(nameHash.hash(domain))).to.be.equal(account2.address);
    });

    it("emits a DomainOwnershipTransferred event when the ownership is transfered", async () => {
      const tx = await subdomainRegistrar.connect(registrarOwner).transferDomainOwnership(account2.address);

      const event = await findEvent(tx, "DomainOwnershipTransferred");

      expect(event?.args?.owner).to.eq(account2.address);
    });

    it("prevents the old contract to register subdomains since he is no longer the owner of the domain", async () => {
      expect(await ens.owner(nameHash.hash(domain))).to.be.equal(subdomainRegistrar.address);

      await subdomainRegistrar.connect(registrarOwner).transferDomainOwnership(account2.address);

      const subDomain = "macedo";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      const action = subdomainRegistrar.connect(account2).register(subDomain, { value: parseUnits("20") });

      await expect(action).to.be.reverted;
    });

    it("transfer the registrar to a new subdomain contract that can register domains", async () => {
      const newSubdomainRegistrar = (await deployContract(registrarOwner, Artifacts.TalSubdomainRegistrar, [
        ens.address,
        resolver.address,
        dnsRegistrar.address,
        priceFeed.address,
        node,
        registrarOwner.address,
        defaultFeeUSD,
      ])) as TalSubdomainRegistrar;

      expect(await ens.owner(nameHash.hash(domain))).to.be.equal(subdomainRegistrar.address);

      await subdomainRegistrar.connect(registrarOwner).transferDomainOwnership(newSubdomainRegistrar.address);

      expect(await ens.owner(nameHash.hash(domain))).to.be.equal(newSubdomainRegistrar.address);

      const subDomain = "sarim";
      await newSubdomainRegistrar.connect(account2).register(subDomain, { value: subdomainPriceInEth });

      expect(await newSubdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account2.address);
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account2.address);
    });
  });
});
