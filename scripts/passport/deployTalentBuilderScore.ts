import { ethers, network } from "hardhat";

import { deployTalentBuilderScore } from "../shared";
import { PassportBuilderScore, PassportRegistry } from "../../test/shared/artifacts";

const PASSPORT_REGISTRY_ADDRESS_MAINNET = "0xb477A9BD2547ad61f4Ac22113172Dd909E5B2331";
const PASSPORT_REGISTRY_ADDRESS_TESTNET = "0xa600b3356c1440B6D6e57b0B7862dC3dFB66bc43";

const PASSPORT_BUILDER_SCORE_MAINNET = "0xBBFeDA7c4d8d9Df752542b03CdD715F790B32D0B"
const PASSPORT_BUILDER_SCORE_TESTNET = "0x5f3aA689C4DCBAe505E6F6c8548DbD9b908bA71d"

const FEE_RECEIVER_MAINNET = "0xC925bD0E839E8e22A7DDEbe7f4C21b187deeC358";
const FEE_RECEIVER_TESTNET = "0x08BC8a92e5C99755C675A21BC4FcfFb59E0A9508";

async function main() {
  console.log(`Deploying passport registry at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const smartBuilderScore = await deployTalentBuilderScore(
    admin.address,
    PASSPORT_BUILDER_SCORE_TESTNET,
    PASSPORT_REGISTRY_ADDRESS_TESTNET,
    FEE_RECEIVER_TESTNET
  );

  console.log(`Smart Builder Score Address: ${smartBuilderScore.address}`);

  console.log("Adding trusted signer");

  const passportBuilderScore = new ethers.Contract(
    PASSPORT_BUILDER_SCORE_TESTNET,
    PassportBuilderScore.abi,
    admin
  );
  await passportBuilderScore.addTrustedSigner(smartBuilderScore.address);

  const passportRegistry = new ethers.Contract(
    PASSPORT_REGISTRY_ADDRESS_TESTNET,
    PassportRegistry.abi,
    admin
  );

  console.log("Transfering ownership");

  // Set smart builder score as the owner of passportRegistry so it's the only contract that can create new passports onchain
  await passportRegistry.transferOwnership(smartBuilderScore.address);

  const newOwner = await passportRegistry.owner();

  console.log(`New owner: ${newOwner}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
