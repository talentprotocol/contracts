import { ethers } from "hardhat";
import { DNSProver } from "@ensdomains/dnsprovejs";
import DnsRegistrar from "@ensdomains/ens-contracts/artifacts/contracts/dnsregistrar/DNSRegistrar.sol/DNSRegistrar.json";
import TalSubdomainRegistrar from "../../artifacts/contracts/subdomain-registrar/TalSubdomainRegistrar.sol/TalSubdomainRegistrar.json";

import { Oracle } from "@ensdomains/dnssecoraclejs";
const packet = require("dns-packet");

const { exit } = process;

const hexEncodeName = (name: string) => "0x" + packet.name.encode(name).toString("hex");

const hexEncodeBuffer = (buffer: Buffer) => "0x" + buffer.toString("hex");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function main() {
  const [owner] = await ethers.getSigners();
  const provider = new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com") as any;
  const feeData = await provider.getFeeData();

  // Address of the deployed registrar smart contract
  // The domain needs to have an _ens record pointing to the address below
  const subdomainRegistrarAddress = "0xc187Cf217f578B7Ef6b895E08197a18E77FCd185";

  const subdomainRegistrarContract = new ethers.Contract(subdomainRegistrarAddress, TalSubdomainRegistrar.abi, owner);

  const address = await subdomainRegistrarContract.owner();
  console.log("subdomainRegistrarContract.owner()", address);

  // mainnet address: 0xa2f428617a523837d4adc81c67a296d42fd95e86
  // goerli address: 0x8edc487d26f6c8fa76e032066a3d4f87e273515d
  const dnsRegistrarAddress = "0xa2f428617a523837d4adc81c67a296d42fd95e86";

  const dnsRegistrarContract = new ethers.Contract(dnsRegistrarAddress, DnsRegistrar.abi, owner);

  const oracleAddress = await dnsRegistrarContract.oracle();
  const oracle = new Oracle(oracleAddress, provider);

  // tal.community for mainnet
  const domain = "tal.community";
  const encodedName = hexEncodeName(domain);

  const prover = DNSProver.create("https://cloudflare-dns.com/dns-query");
  const result = await prover.queryWithProof("TXT", `_ens.${domain}`);
  const { rrsets, proof } = await oracle.getProofData(result);

  const rrsetsHex = rrsets.map((rrset) => [hexEncodeBuffer(rrset.rrset), hexEncodeBuffer(rrset.sig)]);
  console.log("encodedName", encodedName);
  console.log("proof", hexEncodeBuffer(proof));
  console.log("rrsetsHex", rrsetsHex);

  let tx;
  if (rrsets.length === 0) {
    // This happens if someone has submitted the proof directly to DNSSECOracle, hence only claim a name on the registrar.
    tx = await dnsRegistrarContract.claim(encodedName, proof);
  } else {
    tx = await subdomainRegistrarContract.configureDnsOwnership(encodedName, rrsetsHex, hexEncodeBuffer(proof), {
      gasPrice: 1543387859400,
    });
    // tx = await dnsRegistrarContract.proveAndClaim(encodedName, rrsetsHex, hexEncodeBuffer(proof), {gasPrice: feeData.gasPrice?.mul(20)})
  }

  console.log(tx);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
