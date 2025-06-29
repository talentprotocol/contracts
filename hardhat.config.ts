import { task } from "hardhat/config";
import "hardhat-storage-layout";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-verify";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
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
        runs: 200,
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
      url: process.env.BASE_SEPOLIA_RPC_URL,
      accounts: deployer,
      chainId: 84532,
      gasMultiplier: 1.5,
    },
    base: {
      url: process.env.BASE_RPC_URL,
      accounts: deployer,
      chainId: 8453,
      gasMultiplier: 1.5,
    },
    celo: {
      url: process.env.CELO_RPC_URL || "https://forno.celo.org",
      accounts: deployer,
      chainId: 42220,
      gasMultiplier: 1.5,
    },
  },
  gasReporter: {
    currency: "ETH",
    showMethodSig: true,
  },
  etherscan: {
    // Your API keys for Etherscan - using v2 format
    apiKey: process.env.BASE_API_KEY || "",
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
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
