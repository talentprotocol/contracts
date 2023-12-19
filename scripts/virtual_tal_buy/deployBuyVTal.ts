import { ethers, network } from "hardhat";

import { deployVirtualTalBuy } from "../shared";

async function main() {
  console.log(`Deploying buy vTal package ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  // stableAddress mumbai - 0xECd313e29b85cAf347fb832F80427602030cD3Fc
  // stableAddress polygon - 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
  const stableAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
  // safeAddress polygon - 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
  const safeAddress = admin.address;
  const virtualTalBuy = await deployVirtualTalBuy(admin.address, safeAddress, stableAddress);

  console.log(`BuyVirtualTal Address: ${virtualTalBuy.address}`);
  console.log(`BuyVirtualTal owner: ${await virtualTalBuy.owner()}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
