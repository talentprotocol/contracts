import { ethers, upgrades, network } from "hardhat";

import { HttpNetworkConfig } from "hardhat/types";

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner", owner.address);

  const networkConfig = network.config as HttpNetworkConfig;
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.url);

  console.log("network", network.name);

  let stakingAddr = "";

  switch (network.name) {
    case "celo":
      stakingAddr = "0x4C9ca5956C4E39ac489081F8b0d85e987c55dB08";

      break;
    case "polygon":
      stakingAddr = "0xFa236a656A8FBD82801Fe5bA7b127FBbC4B0ed11";

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

  const staking = await ethers.getContractAt("StakingV3State", stakingAddr);
  const StakingMigrationV3 = await ethers.getContractFactory("StakingV3Migration");

  console.log("validating upgrade");
  await upgrades.validateUpgrade(staking, StakingMigrationV3);
  console.log("upgrade validated");

  console.log("upgrading proxy");
  const newFactory = await upgrades.upgradeProxy(staking, StakingMigrationV3);
  await newFactory.deployed();
  console.log("proxy upgraded");

  console.log("start", await staking.start());
  console.log("end", await staking.end());
  console.log("rewardsMax", await staking.rewardsMax());
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
