import { ethers, network } from "hardhat";
import TalentFactory from "../artifacts/contracts/TalentFactory.sol/TalentFactory.json";
import Staking from "../artifacts/contracts/Staking.sol/Staking.json";

const { exit } = process;

async function main() {
  const [deployer] = await ethers.getSigners();
  const factory = new ethers.Contract("0x7FA17B29430321F302f97a120Ac485f580617D5e", TalentFactory.abi)
  const staking = new ethers.Contract("0xd0bFcb002F6B2938E752EE0473B36Db686317dA4", Staking.abi)

  const tx = await factory
    .connect(deployer)
    .setMinter(staking.address, { gasPrice: "1000000000000000000"})
  await tx.wait();
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
