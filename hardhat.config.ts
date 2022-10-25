import { task } from "hardhat/config";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";

import type { HardhatUserConfig } from "hardhat/config";

// const deployer = [""];

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: ["4a8acc145360413a6f8607b3303bafac3797cc4a6d432efd35a4a6847352acd4"],
      chainId: 44787,
      gasPrice: 0.5 * 10 ** 9,
      gas: 8000000,
    },
  },
  gasReporter: {
    currency: "ETH",
  },
};

export default config;
