import { ethers } from "hardhat";
import type { TalSubdomainRegistrar } from "../../typechain-types";

var nameHash = require("eth-ens-namehash");

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  // goerli 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e
  // mainnet 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
  const ethUsdPriceFeedAddress = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";

  // The same address is used for mainnet and testnet
  const ensAddress = "0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e";

  // mainnet address: 0xa2f428617a523837d4adc81c67a296d42fd95e86
  // goerli address: 0x8edc487d26f6c8fa76e032066a3d4f87e273515d
  const dnsRegistrarAddress = "0xa2f428617a523837d4adc81c67a296d42fd95e86";

  // mainnet address: 0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41
  // goerli address: 0xE264d5bb84bA3b8061ADC38D3D76e6674aB91852
  const publicResolverAddress = "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41";
  // tal.community for mainnet
  const domain = "tal.community";
  const node = nameHash.hash(domain);
  const subdomainFee = 8;

  const subdomainRegistrarContract = await ethers.getContractFactory("TalSubdomainRegistrar");

  const deployedSubdomainRegistrar = await subdomainRegistrarContract.deploy(
    ensAddress,
    publicResolverAddress,
    dnsRegistrarAddress,
    ethUsdPriceFeedAddress,
    node,
    owner.address,
    subdomainFee
  );
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
