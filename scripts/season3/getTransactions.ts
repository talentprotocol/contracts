import { ethers, upgrades, waffle, network } from "hardhat";

import fs from "fs";
import path from "path";

import { HttpNetworkConfig } from "hardhat/types";
import { EtherscanProvider } from "@ethersproject/providers";
import { CeloscanProvider } from "@celo-tools/celo-ethers-wrapper";

const { parseUnits, formatUnits } = ethers.utils;
const { exit } = process;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);

  const networkConfig = network.config as HttpNetworkConfig;
  let provider = null;

  if (network.name == "celo" || network.name == "alfajores") {
    provider = new CeloscanProvider(network.name);
  } else {
    provider = new EtherscanProvider(networkConfig.chainId);
  }

  console.log("network", network.name);
  console.log("provider", provider);

  let stakingAddr = "";
  const transactionsDir = path.join(__dirname, "..", "transactions", `transactions-for-${network.name}`);

  if (!fs.existsSync(transactionsDir)) {
    fs.mkdirSync(transactionsDir);
  }

  switch (network.name) {
    case "celo":
      stakingAddr = "0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636";

      break;
    case "polygon":
      stakingAddr = "0xEa998Ff9c0c075cD035b25095D1833E5aF0aF873";

      break;

    case "alfajores":
      stakingAddr = "0x0af4603de5F98f6C5ba6cCbc1Facf04942E10084";

      break;

    case "mumbai":
      stakingAddr = "0x4C1A1DaaEc0a1660359F83D76571f4b000eC7DA6";

      break;
    default:
      break;
  }

  // const history = await provider.getHistory(stakingAddr);
  // const hashes = history.map((h) => h.hash);

  // console.log("history:", hashes);

  // fs.appendFileSync(path.join(transactionsDir, `all-transactions-${stakingAddr}.json`), `${hashes}`);

  const history = await provider.getHistory(stakingAddr, 43141389);
  const hashes = history.map((h) => `"${h.hash}"\n`);

  console.log("history:", hashes);

  fs.appendFileSync(path.join(transactionsDir, `all-transactions-${stakingAddr}.json`), `${hashes}`);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
