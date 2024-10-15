import { ethers, network } from "hardhat";
import { deployPassportBuilderScore, deploySmartBuilderScore } from "../shared";

const PASSPORT_MAINNET = "0xb477A9BD2547ad61f4Ac22113172Dd909E5B2331";
const PASSPORT_TESTNET = "0xa600b3356c1440B6D6e57b0B7862dC3dFB66bc43";

const FEE_RECEIVER_MAINNET = "0xC925bD0E839E8e22A7DDEbe7f4C21b187deeC358";
const FEE_RECEIVER_TESTNET = "0x08BC8a92e5C99755C675A21BC4FcfFb59E0A9508";

async function main() {
  console.log(`Deploying passport builder score at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const builderScore = await deployPassportBuilderScore(PASSPORT_TESTNET, admin.address);

  console.log(`Scorer Address: ${builderScore.address}`);
  console.log(`Scorer owner: ${await builderScore.owner()}`);

  const smartBuilderScore = await deploySmartBuilderScore(
    admin.address,
    PASSPORT_TESTNET,
    FEE_RECEIVER_TESTNET,
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
