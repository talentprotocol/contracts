import { ethers, upgrades } from "hardhat";
import * as FactoryArtifactV2 from "../artifacts/contracts/TalentFactoryV2.sol/TalentFactoryV2.json";
import * as TalentTokenArtifactV2 from "../artifacts/contracts/test/TalentTokenV2.sol/TalentTokenV2.json";

const { exit } = process;

async function main() {
  const [owner, secondary] = await ethers.getSigners();

  console.log("francisco: ", owner.address);
  console.log("fred: ", secondary.address);
  
  const provider =  new ethers.providers.JsonRpcProvider("https://forno.celo.org");

  const factory = new ethers.Contract(
    "0xa902DA7a40a671B84bA3Dd0BdBA6FD9d2D888246",
    FactoryArtifactV2.abi,
    owner
  );

  await factory.connect(owner).transferMinter("0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636");

  console.log("Transferred minter for factory");

  const allTokens: any = [];

  console.log("Starting transfer of ownership of talent tokens minting rules");

  for await (const item of allTokens) {
    const token = new ethers.Contract(
      item,
      TalentTokenArtifactV2.abi,
      owner
    )

    console.log("Migrating token: ", await token.symbol());

    console.log("Adding new minter.");
    await token.addNewMinter("0x5a6eF881E3707AAf7201dDb7c198fc94B4b12636");
    console.log("Removing old minter");
    await token.removeMinter("0x8ea91a982d93836415CE3abbaf12d59fb8cE3Ff8");
  }
  console.log("Done.");
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
