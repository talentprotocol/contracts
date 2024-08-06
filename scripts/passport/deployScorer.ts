import { ethers, network } from "hardhat";

import { deployPassportBuilderScore, deployPassportSources, deploySmartScorer } from "../shared";

async function main() {
  console.log(`Deploying passport builder score at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  // base sepolia: 0xa600b3356c1440b6d6e57b0b7862dc3dfb66bc43
  // base mainnet: 0xb477A9BD2547ad61f4Ac22113172Dd909E5B2331
  const passportRegistry = "0xa600b3356c1440b6d6e57b0b7862dc3dfb66bc43";

  const scorer = await deployPassportBuilderScore(passportRegistry, admin.address);
  console.log(`Scorer Address: ${scorer.address}`);
  console.log(`Scorer owner: ${await scorer.owner()}`);

  const sources = await deployPassportSources(admin.address);
  console.log(`Sources Address: ${sources.address}`);
  console.log(`Sources owner: ${await sources.owner()}`);

  const smartScorer = await deploySmartScorer(
    admin.address,
    scorer.address,
    sources.address,
    passportRegistry,
    admin.address
  );
  console.log(`Smart Scorer Address: ${smartScorer.address}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
