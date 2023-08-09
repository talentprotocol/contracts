import { ethers, upgrades } from "hardhat";
import type { TalentFactoryV3 } from "../../typechain-types";
import TalentFactoryV2 from "../../artifacts/contracts/TalentFactoryV2.sol/TalentFactoryV2.json";

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner: ", owner.address);

  const talentFactoryV3 = await ethers.getContractAt("TalentFactoryV3", "0x8ee4f3044Ef0166A6DB12b0e9Eeb1735f1Fc7cc9");
  const rewardCalculatorV2 = await ethers.getContractAt(
    "RewardCalculatorV2",
    "0x14A743E115CfE9e88075B2f9912dee66452C914e"
  );
  const virtualTAL = await ethers.getContractAt("VirtualTAL", "0x838087d22B57952c5E4ff37D46682d71f066B08f");
  const stakingV3 = await ethers.getContractAt("StakingV3", "0x2333F718D74308c521A3Fa11f8f0a74A7aD285cD");

  const talentFactoryV3AdminAddress = await upgrades.erc1967.getAdminAddress(talentFactoryV3.address);
  const rewardCalculatorV2AdminAddress = await upgrades.erc1967.getAdminAddress(rewardCalculatorV2.address);
  const virtualTALAdminAddress = await upgrades.erc1967.getAdminAddress(virtualTAL.address);
  const stakingV3AdminAddress = await upgrades.erc1967.getAdminAddress(stakingV3.address);
  console.log("talentFactoryV3AdminAddress: ", talentFactoryV3AdminAddress);
  console.log("rewardCalculatorV2AdminAddress: ", rewardCalculatorV2AdminAddress);
  console.log("virtualTALAdminAddress: ", virtualTALAdminAddress);
  console.log("stakingV3AdminAddress: ", stakingV3AdminAddress);

  await upgrades.admin.changeProxyAdmin(virtualTAL.address, "0x54ecc777Dd748B1617FaB6B574324eA11F5DBF20");
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
