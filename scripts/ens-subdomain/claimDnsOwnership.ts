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
  const provider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth_goerli") as any;
  const feeData = await provider.getFeeData();

  // Address of the deployed registrar smart contract
  // The domain needs to have an _ens record pointing to the address below
  const subdomainRegistrarAddress = "0x38B5Fb838e5A605dF510525d4A4D197Ae0DB20f0";

  const subdomainRegistrarContract = new ethers.Contract(subdomainRegistrarAddress, TalSubdomainRegistrar.abi, owner);

  const address = await subdomainRegistrarContract.owner();
  console.log("subdomainRegistrarContract.owner()", address);

  // mainnet address: 0xDaaF96c344f63131acadD0Ea35170E7892d3dfBA
  // goerli address: 0xE264d5bb84bA3b8061ADC38D3D76e6674aB91852
  const publicResolverAddress = "0xE264d5bb84bA3b8061ADC38D3D76e6674aB91852";
  // mainnet address: 0xa2f428617a523837d4adc81c67a296d42fd95e86
  // goerli address: 0x8edc487d26f6c8fa76e032066a3d4f87e273515d
  const dnsRegistrarAddress = "0x8edc487d26f6c8fa76e032066a3d4f87e273515d";

  const dnsRegistrarContract = new ethers.Contract(dnsRegistrarAddress, DnsRegistrar.abi, owner);

  const oracleAddress = await dnsRegistrarContract.oracle();
  const oracle = new Oracle(oracleAddress, provider);

  // tal.community for mainnet
  const domain = "tal.builders";
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
    tx = await dnsRegistrarContract.claim(encodedName, proof, { gasPrice: feeData.gasPrice?.mul(20) });
  } else {
    // This submits proof to DNSSECOracle, then claim a name.
    tx = await subdomainRegistrarContract.configureDnsOwnership(encodedName, rrsetsHex, hexEncodeBuffer(proof), {
      gasPrice: feeData.gasPrice?.mul(20),
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
