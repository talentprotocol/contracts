import { task } from "hardhat/config";
import "hardhat-storage-layout";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-viem";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";
import dotenv from "dotenv";

dotenv.config();

import type { HardhatUserConfig } from "hardhat/config";

// Never hardcode a pk here. Use the .env file
const deployer = [process.env.PRIVATE_KEY ?? ""];

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 4294967295,
      },
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  networks: {
    baseSepolia: {
      url: "https://api.developer.coinbase.com/rpc/v1/base-sepolia/Ip9cOQPtBOm81rN2I9_1rBiMXOfKBxii",
      accounts: deployer,
      chainId: 84532,
      gasMultiplier: 1.5,
    },
    base: {
      url: "https://api.developer.coinbase.com/rpc/v1/base/Ip9cOQPtBOm81rN2I9_1rBiMXOfKBxii",
      accounts: deployer,
      chainId: 8453,
      gasMultiplier: 1.5,
    },
  },
  gasReporter: {
    currency: "ETH",
    showMethodSig: true,
  },
  etherscan: {
    // Your API keys for Etherscan
    apiKey: {
      base: process.env.BASE_API_KEY || "",
      baseSepolia: process.env.BASE_API_KEY || "",
    },
    // Custom chains that are not supported by default
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
};

export default config;
