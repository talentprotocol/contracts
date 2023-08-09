import { ethers, network } from "hardhat";

import axios from "axios";

import { approvedWallets } from "../utils";
import { HttpNetworkConfig } from "hardhat/types";
const { parseUnits } = ethers.utils;

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);
  console.log("network", network.name);

  const networkConfig = network.config as HttpNetworkConfig;
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.url);

  const factory = await ethers.getContractAt("TalentFactoryV3Migration", "0x6633d99c035AFb90b073A57EE06F9E46e06D3f88");

  const setWhitelister = await factory.setWhitelister("0x33041027dd8F4dC82B6e825FB37ADf8f15d44053");
  await setWhitelister.wait();

  let index = 0;

  // for await (const wallet of approvedWallets) {
  //   console.log("whitelisting wallet: ", wallet);
  //   const feeData = await provider.getFeeData();
  //   const tx = await factory.whitelistAddress(wallet, {
  //     maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
  //     maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
  //   });
  //   index += 1;
  //   // await tx.wait();
  //   console.log(`done ${index} of ${approvedWallets.length}`);
  // }
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
