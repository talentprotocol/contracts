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

  const factory = await ethers.getContractAt("TalentFactoryV3Migration", "0xE072455F02Ed15bdEEB95165FF4200a8b0C72E1A");

  const setWhitelister = await factory.setWhitelister(owner.address);
  await setWhitelister.wait();

  let index = 0;

  for await (const wallet of approvedWallets) {
    console.log("whitelisting wallet: ", wallet);
    const feeData = await provider.getFeeData();
    const tx = await factory.whitelistAddress(wallet, {
      maxFeePerGas: feeData.maxFeePerGas?.mul(13).div(10),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(13).div(10),
    });
    index += 1;
    // await tx.wait();
    console.log(`done ${index} of ${approvedWallets.length}`);
  }
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
