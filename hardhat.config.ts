import { task } from "hardhat/config";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";

import type { HardhatUserConfig } from "hardhat/config";

const deployer = {
  mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
};

// const deployer = [""];

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
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
      accounts: deployer,
      chainId: 44787,
    },
    celo: {
      url: "https://forno.celo.org",
      accounts: deployer,
      chainId: 42220,
    },
    polygonMumbai: {
      url: "https://matic-mumbai.chainstacklabs.com",
      accounts: deployer,
      chainId: 80001,
    },
    matic: {
      url: "https://polygon.llamarpc.com",
      accounts: deployer,
      chainId: 137,
    },
  },
  etherscan: {
    // apiKey: <api_key> ,
  },
  gasReporter: {
    currency: "ETH",
  },
};

export default config;
