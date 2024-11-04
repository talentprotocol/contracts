import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { deployTalentVault } from "../shared";

const TALENT_TOKEN_MAINNET = "";
const TALENT_TOKEN_TESTNET = "0x7c2a63e1713578d4d704b462C2dee311A59aE304";

const YIELD_SOURCE_MAINNET = "";
const YIELD_SOURCE_TESTNET = "0x33041027dd8F4dC82B6e825FB37ADf8f15d44053";

const PASSPORT_BUILDER_SCORE_MAINNET = "";
const PASSPORT_BUILDER_SCORE_TESTNET = "0x5f3aA689C4DCBAe505E6F6c8548DbD9b908bA71d";

async function main() {
  console.log(`Deploying Talent Vault at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const maxYieldAmount = ethers.utils.parseEther("10000");

  const talentVault = await deployTalentVault(
    TALENT_TOKEN_TESTNET,
    YIELD_SOURCE_TESTNET,
    maxYieldAmount,
    PASSPORT_BUILDER_SCORE_TESTNET
  );

  console.log(`Talent Vault deployed at ${talentVault.address}`);
  console.log(
    `Params for verification: Contract ${talentVault.address} Owner ${admin.address} Talent Token ${TALENT_TOKEN_TESTNET} Yield Source ${YIELD_SOURCE_TESTNET}`
  );

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
