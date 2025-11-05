import { ethers, network } from "hardhat";
import { deployTalentVaultV3 } from "../shared";

const TALENT_TOKEN_MAINNET = "0x9a33406165f562E16C3abD82fd1185482E01b49a";
const TALENT_TOKEN_TESTNET = "0x7c2a63e1713578d4d704b462C2dee311A59aE304";

const YIELD_SOURCE_MAINNET = "0x34118871f5943D6B153381C0133115c3B5b78b12";
const YIELD_SOURCE_TESTNET = "0x33041027dd8F4dC82B6e825FB37ADf8f15d44053";

async function main() {
  console.log(`Deploying Talent Vault V3 at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const talentVaultV3 = await deployTalentVaultV3(
    TALENT_TOKEN_MAINNET,
    YIELD_SOURCE_MAINNET
  );

  console.log(`Talent Vault V3 deployed at ${talentVaultV3.address}`);
  console.log(
    `Params for verification: Contract ${talentVaultV3.address} Owner ${admin.address} Talent Token ${TALENT_TOKEN_MAINNET} Yield Source ${YIELD_SOURCE_MAINNET}`
  );

  console.log("Approve the vault to spend the talent tokens: ", ethers.utils.parseEther("100000"));

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
