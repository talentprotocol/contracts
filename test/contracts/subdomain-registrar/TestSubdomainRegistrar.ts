// const ENS = artifacts.require("ENSRegistry");
// const SubdomainRegistrar = artifacts.require("SubdomainRegistrar");
// const HashRegistrar = artifacts.require("HashRegistrar");
// const TestResolver = artifacts.require("TestResolver");
import chai from "chai";
import { ethers, waffle } from "hardhat";

const { expect } = chai;
const { deployContract } = waffle;

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { TestResolver, TalSubdomainRegistrar } from "../../../typechain-types";

import { Artifacts } from "../../shared";
const { parseUnits } = ethers.utils;

const packet = require('dns-packet');

var nameHash = require('eth-ens-namehash');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('SubdomainRegistrar', function () {
  const hexEncodeName = (name: String) =>
    '0x' + packet.name.encode(name).toString('hex');

  const hexEncodeTXT = (keys: any) =>
    '0x' + packet.answer.encode(keys).toString('hex');

  let ensOwner: SignerWithAddress;
  let registrarOwner: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;

  let ens: any;
  let dnsRegistrar: any;
  let subdomainRegistrar: TalSubdomainRegistrar;
  let resolver: TestResolver;
  let dnssec: any;
  let root: any;

  const label = 'test';
  const domain = `${label}.community`;
  const node = nameHash.hash(domain);
  const defaultFee = parseUnits("8");
  const now = Math.round(new Date().getTime() / 1000);

  before(async function () {
    [ensOwner, registrarOwner, account1, account2] = await ethers.getSigners();

    await builder();
  });

  const builder = async () => {
    ens = await deployContract(ensOwner, Artifacts.ENSRegistry, []);
    root = await deployContract(ensOwner, Artifacts.ENSRoot, [ens.address]);
    await ens.setOwner(nameHash.hash(0x0), root.address)
    resolver = await deployContract(ensOwner, Artifacts.TestResolver, []) as TestResolver;
    dnssec = await deployContract(ensOwner, Artifacts.TestDNSSEC, []);
    const suffixes = await deployContract(ensOwner, Artifacts.SimplePublicSuffixList, []);
    await suffixes.addPublicSuffixes([
      hexEncodeName('com'),
      hexEncodeName('community'),
    ])
    dnsRegistrar = await deployContract(ensOwner, Artifacts.TestDNSRegistrar, [dnssec.address, suffixes.address, ens.address]);
    await root.setController(dnsRegistrar.address, true)

    subdomainRegistrar = await deployContract(registrarOwner, Artifacts.TalSubdomainRegistrar, [
      ens.address,
      resolver.address,
      dnsRegistrar.address,
      node,
      registrarOwner.address,
      defaultFee
    ]) as TalSubdomainRegistrar;
  };

  it("validates if the contract can be deployed", async () => {
    expect(subdomainRegistrar.address).not.to.be.equal(ZERO_ADDRESS);
  });

  it('sets the correct owner on the subdomain registrar', async() => {
    expect(await subdomainRegistrar.owner()).to.be.equal(registrarOwner.address);
  })

  it('allows the contract owner to claim the DNS record he owns', async() => {
    const proof = hexEncodeTXT({
      name: `_ens.${domain}`,
      type: 'TXT',
      class: 'IN',
      ttl: 3600,
      data: ['a=' + subdomainRegistrar.address]
    });
    
    await dnssec.setData(
      16,
      hexEncodeName(`_ens.${domain}`),
      now,
      now,
      proof
    );

    await subdomainRegistrar.configureDnsOwnership(hexEncodeName(domain), [{rrset: proof, sig: '0x'}], proof);


    expect(await ens.owner(nameHash.hash(domain))).to.be.equal(subdomainRegistrar.address);
    expect(await ens.resolver(nameHash.hash(domain))).to.be.equal(resolver.address);
  })

  describe("testing functions", () => {
    beforeEach(async () => {
      await claimDNS();
    });

    const claimDNS = async () => {
      const proof = hexEncodeTXT({
        name: `_ens.${domain}`,
        type: 'TXT',
        class: 'IN',
        ttl: 3600,
        data: ['a=' + subdomainRegistrar.address]
      });
      
      await dnssec.setData(
        16,
        hexEncodeName(`_ens.${domain}`),
        now,
        now,
        proof
      );
  
      await subdomainRegistrar.configureDnsOwnership(hexEncodeName(domain), [{rrset: proof, sig: '0x'}], proof);
    }

    it('allows someone to register a subdomain not taken', async() => {
      const subDomain = "dinis";
      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(ZERO_ADDRESS);

      const buyerPreviousBalance = await ethers.provider.getBalance(account1.address);

      const ownerPreviousBalance = await ethers.provider.getBalance(registrarOwner.address);

      const tx = await subdomainRegistrar.connect(account1).register(subDomain, { value: defaultFee });

      expect(await subdomainRegistrar.subDomainOwner(subDomain)).to.be.equal(account1.address);

      const receipt = await tx.wait()
      const gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      const amountSpent = defaultFee.add(gasSpent);

      const buyerUpdatedBalance = await ethers.provider.getBalance(account1.address);
      expect(buyerUpdatedBalance).to.be.equal(buyerPreviousBalance.sub(amountSpent));

      const ownerUpdatedBalance = await ethers.provider.getBalance(registrarOwner.address);
      expect(ownerUpdatedBalance).to.be.equal(ownerPreviousBalance.add(defaultFee));
    })
  })
});
