import { ethers, network, upgrades, waffle } from "hardhat";
import * as StakingMigrationArtifact from "../../artifacts/contracts/StakingMigration.sol/StakingMigration.json";
import * as StakingMigrationV3Artifact from "../../artifacts/contracts/season3/staking/StakingMigrationV3.sol/StakingMigrationV3.json";
import dayjs from "dayjs";
import type { StateStakingV3, StakingMigrationV3 } from "../../typechain-types";

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner: ", owner.address);

  const provider = new ethers.providers.JsonRpcProvider("https://alfajores-forno.celo-testnet.org");

  const virtualTAL = await ethers.getContractAt("VirtualTAL", "0x838087d22B57952c5E4ff37D46682d71f066B08f");
  console.log("virtualTAL", virtualTAL.address);

  const tx = await virtualTAL
    .connect(owner)
    .adminMint("0x33041027dd8F4dC82B6e825FB37ADf8f15d44053", ethers.utils.parseUnits("1000"));

  await tx.wait();

  const tx2 = await virtualTAL
    .connect(owner)
    .adminMint("0xce4C7802719eF4B0039667183De79f1d691C4C73", ethers.utils.parseUnits("1000"));

  await tx2.wait();

  console.log("leal's tal:", await virtualTAL.getBalance("0x33041027dd8F4dC82B6e825FB37ADf8f15d44053"));
  console.log("fred's tal:", await virtualTAL.getBalance("0xce4C7802719eF4B0039667183De79f1d691C4C73"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
