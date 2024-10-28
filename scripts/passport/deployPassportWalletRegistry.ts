import { ethers, network } from "hardhat";

import { deployPassportWalletRegistry } from "../shared";

const PASSPORT_REGISTRY_ADDRESS_TESTNET = "0xa600b3356c1440B6D6e57b0B7862dC3dFB66bc43";
const PASSPORT_REGISTRY_ADDRESS_MAINNET = "0xb477A9BD2547ad61f4Ac22113172Dd909E5B2331";

async function main() {
  console.log(`Deploying passport registry at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const passportRegistry = await deployPassportWalletRegistry(admin.address, PASSPORT_REGISTRY_ADDRESS_TESTNET);

  console.log(`Passport Registry Address: ${passportRegistry.address}`);
  console.log(`Passport Registry owner: ${await passportRegistry.owner()}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
