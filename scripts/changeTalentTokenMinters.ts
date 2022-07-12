import { ethers, network, upgrades, waffle } from "hardhat";
import type { TalentProtocol } from "../typechain-types";


const { exit } = process;

async function main() {
  const [creator] = await ethers.getSigners();
  console.log(creator.address);

  const TalentProtocolFactory = await ethers.getContractFactory("TalentProtocol");
  const tal = (await upgrades.deployProxy(TalentProtocolFactory, [0])) as TalentProtocol;

  console.log("TAL address is: ", tal.address);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
