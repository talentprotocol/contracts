import { ethers } from "hardhat";
import type { TalSubdomainRegistrar } from "../../typechain-types";

var nameHash = require('eth-ens-namehash');

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  // The same address is used for mainnet and testnet
  const ens_address = "0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e";

  // mainnet address: 0xa2f428617a523837d4adc81c67a296d42fd95e86
  // goerli address: 0x8edc487d26f6c8fa76e032066a3d4f87e273515d
  const dnsRegistrarAddress = "0x8edc487d26f6c8fa76e032066a3d4f87e273515d";

  // mainnet address: 0xDaaF96c344f63131acadD0Ea35170E7892d3dfBA
  // goerli address: 0xE264d5bb84bA3b8061ADC38D3D76e6674aB91852
  const publicResolverAddress = "0xE264d5bb84bA3b8061ADC38D3D76e6674aB91852";
  const domain = "tal.builders";
  const node = nameHash.hash(domain);
  const subdomainFee = 0;

  const subdomainRegistrarContract = await ethers.getContractFactory("TalSubdomainRegistrar");
  
  const deployedSubdomainRegistrar = await subdomainRegistrarContract.deploy(ens_address, publicResolverAddress, dnsRegistrarAddress, node, owner.address, subdomainFee);
  await deployedSubdomainRegistrar.deployed();

  console.log(deployedSubdomainRegistrar.address);
  // 0x4fE7De03779A2fa38f897BE700862b642feAa7cb Testnet deployed contract
  return deployedSubdomainRegistrar as TalSubdomainRegistrar;
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
