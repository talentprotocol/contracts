import { ethers, upgrades, waffle, network } from "hardhat";

import { HttpNetworkConfig } from "hardhat/types";
import { celoTokens, polygonTokens, polygonTransactions, newPolygonTransactions, sleep } from "../utils";

const { formatUnits } = ethers.utils;
const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);
  console.log("network", network.name);

  let stakingAddr = "";
  let tokens: string[] = [];

  switch (network.name) {
    case "celo":
      stakingAddr = "0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636";
      tokens = tokens.concat(celoTokens);

      break;
    case "polygon":
      stakingAddr = "0xEa998Ff9c0c075cD035b25095D1833E5aF0aF873";
      tokens = tokens.concat(polygonTokens);

      break;

    case "alfajores":
      stakingAddr = "0x0af4603de5F98f6C5ba6cCbc1Facf04942E10084";

      break;

    case "mumbai":
      stakingAddr = "0x38D0760d77A42740183e5C4DA876B6493DC53272";

      break;
    default:
      break;
  }

  const staking = await ethers.getContractAt("StakingV3Migration", stakingAddr);
  const StakingV3 = await ethers.getContractFactory("StakingV3");

  console.log("validating upgrade");
  await upgrades.validateUpgrade(staking, StakingV3);
  console.log("upgrade validated");

  console.log("upgrading proxy");
  const newFactory = await upgrades.upgradeProxy(staking, StakingV3);
  await newFactory.deployed();
  console.log("proxy upgraded");

  console.log("start", await staking.start());
  console.log("end", await staking.end());
  console.log("rewardsMax", formatUnits(await staking.rewardsMax()));
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
