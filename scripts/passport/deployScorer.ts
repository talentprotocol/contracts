import { ethers, network } from "hardhat";
import { zeroAddress } from "viem";
import { deployPassportBuilderScore, deploySmartBuilderScore } from "../shared";
import { verify } from "node:crypto";

const PASSPORT_MAINNET = "0xb477A9BD2547ad61f4Ac22113172Dd909E5B2331";
const PASSPORT_TESTNET = "0xa600b3356c1440B6D6e57b0B7862dC3dFB66bc43";

async function main() {
  console.log(`Deploying passport builder score at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const builderScore = await deployPassportBuilderScore(PASSPORT_MAINNET, admin.address);

  console.log(`Scorer Address: ${builderScore.address}`);
  console.log(`Scorer owner: ${await builderScore.owner()}`);

  const smartBuilderScore = await deploySmartBuilderScore(
    admin.address,
    PASSPORT_MAINNET,
    "0xC925bD0E839E8e22A7DDEbe7f4C21b187deeC358",
    builderScore.address
  );

  console.log(`Smart Builder Score Address: ${smartBuilderScore.address}`);

  console.log("Adding trusted signer");
  await builderScore.addTrustedSigner(smartBuilderScore.address);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
