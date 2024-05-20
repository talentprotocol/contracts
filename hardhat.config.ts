import { task } from "hardhat/config";

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
const deployer = ["fc90f7b7edbcb758e00cc9c26752e240b8f0bf49d9ce2085047c40693aef6601" ?? ""];

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
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: deployer,
      chainId: 137,
      gasMultiplier: 1.5,
    },
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
  },
  etherscan: {
    // Your API keys for Etherscan
    apiKey: {
      celo: process.env.CELO_API_KEY || "",
      alfajores: process.env.CELO_API_KEY || "",
      polygon: process.env.POLYGON_API_KEY || "",
      polygonMumbai: process.env.POLYGON_API_KEY || "",
      base: process.env.POLYGON_API_KEY || "",
      baseSepolia: process.env.POLYGON_API_KEY || "",
    },
    // Custom chains that are not supported by default
    customChains: [
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io/",
        },
      },
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
