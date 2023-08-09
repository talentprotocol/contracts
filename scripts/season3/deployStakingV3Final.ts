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
      stakingAddr = "0x4C9ca5956C4E39ac489081F8b0d85e987c55dB08";
      tokens = tokens.concat(celoTokens);

      break;
    case "polygon":
      stakingAddr = "0xFa236a656A8FBD82801Fe5bA7b127FBbC4B0ed11";
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
  const newStaking = await upgrades.upgradeProxy(staking, StakingV3);
  await newStaking.deployed();
  console.log("proxy upgraded");

  console.log("start", await newStaking.start());
  console.log("end", await newStaking.end());
  console.log("rewardsMax", formatUnits(await newStaking.rewardsMax()));
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
