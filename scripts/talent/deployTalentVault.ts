import { ethers, network } from "hardhat";
import { deployTalentVault } from "../shared";

const TALENT_TOKEN_MAINNET = "0x9a33406165f562E16C3abD82fd1185482E01b49a";
const TALENT_TOKEN_TESTNET = "0x7c2a63e1713578d4d704b462C2dee311A59aE304";

const YIELD_SOURCE_MAINNET = "0x34118871f5943D6B153381C0133115c3B5b78b12";
const YIELD_SOURCE_TESTNET = "0x33041027dd8F4dC82B6e825FB37ADf8f15d44053";

const PASSPORT_BUILDER_SCORE_MAINNET = "0xBBFeDA7c4d8d9Df752542b03CdD715F790B32D0B";
const PASSPORT_BUILDER_SCORE_TESTNET = "0x5f3aA689C4DCBAe505E6F6c8548DbD9b908bA71d";

const WALLET_REGISTRY_MAINNET = "0x9B729d9fC43e3746855F7E02238FB3a2A20bD899";

async function main() {
  console.log(`Deploying Talent Vault at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const talentVault = await deployTalentVault(
    TALENT_TOKEN_MAINNET,
    YIELD_SOURCE_MAINNET,
    PASSPORT_BUILDER_SCORE_MAINNET,
    WALLET_REGISTRY_MAINNET
  );

  console.log(`Talent Vault deployed at ${talentVault.address}`);
  console.log(
    `Params for verification: Contract ${talentVault.address} Owner ${admin.address} Talent Token ${TALENT_TOKEN_MAINNET} Yield Source ${YIELD_SOURCE_MAINNET} Wallet Registry ${WALLET_REGISTRY_MAINNET}`
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
