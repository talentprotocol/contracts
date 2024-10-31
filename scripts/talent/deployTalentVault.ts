import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { deployTalentVault } from "../shared";

const TALENT_TOKEN_MAINNET = "";
const TALENT_TOKEN_TESTNET = "";

const YIELD_SOURCE_MAINNET = "";
const YIELD_SOURCE_TESTNET = "";

async function main() {
  console.log(`Deploying Talent Vault at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const talentVault = await deployTalentVault(admin.address, TALENT_TOKEN_MAINNET, YIELD_SOURCE_MAINNET);

  console.log(`Talent Vault deployed at ${talentVault.address}`);
  console.log(
    `Params for verification: Contract ${talentVault.address} Owner ${admin.address} Talent Token ${TALENT_TOKEN_MAINNET} Yield Source ${YIELD_SOURCE_MAINNET}`
  );

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
