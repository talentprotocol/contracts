import { ethers, upgrades, waffle } from "hardhat";
import * as FactoryArtifactV2 from "../artifacts/contracts/TalentFactoryV2.sol/TalentFactoryV2.json";
import * as TalentTokenArtifactV2 from "../artifacts/contracts/test/TalentTokenV2.sol/TalentTokenV2.json";
import { UpgradeableBeacon__factory } from "../typechain-types";

const { exit } = process;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  const provider =  new ethers.providers.JsonRpcProvider("https://forno.celo.org");

  // console.log("owner wallet: ", owner.address);

  // const factory = new ethers.Contract(
  //   "0xa902DA7a40a671B84bA3Dd0BdBA6FD9d2D888246",
  //   FactoryArtifactV2.abi,
  //   owner
  // );

  // const beaconAddr = await factory.implementationBeacon();

  // console.log("beacon address: ", beaconAddr);
  // const talentTokenV2 = await deployContract(owner, TalentTokenArtifactV2, []);

  // console.log("New talent token contract: ", talentTokenV2.address);
  // console.log("Connecting to beacon");
  // const beacon = UpgradeableBeacon__factory.connect(beaconAddr, owner);

  // console.log("Upgrading");
  // await beacon.upgradeTo(talentTokenV2.address);

  // console.log("checking token upgrade");

  const token = new ethers.Contract(
    "0x23Fe4CD8fC306b44C756f3fd4770730867dB5218",
    TalentTokenArtifactV2.abi,
    owner
  );

  console.log("Is token version: ", await token.version());

  // const allTokens: any = ["0xbbc37ea38ec834ebf296fee21d059f0528eebdd3","0x543766fc6ab468719ad69d8dc2134b127f56865a","0x615170a6d049c037dad71c1d6fa190ac7f9d903e","0xdbafa5dd56e582bb15805a7b665e5183e82459ca","0xf942f5f6a484d5a2aec915dc133e439f1aa5f2cb","0x9c377f7d83f3f3d1cebbb158a4691344f1f7e17a","0x6608e34fc60e3022111084dd5dea5cd2700745fc","0x08da06e515c801865d6be1008b014cb92141e394","0x5cabd4c99388234b0bf797428a1579254b9effd5","0x9954a7ff41da8ce2bda065d0d1e7096a89fb22a5","0x12bde07008bae57715a18ed7451cbef08c855266","0xecc48d4483109ecef307a300d8acb14893c4d311"];
    
  // for await (const item of allTokens) {
  //   const token = new ethers.Contract(
  //     item,
  //     TalentTokenArtifactV2.abi,
  //     owner
  //   )

  //   console.log("Migrating token: ", await token.symbol());

  //   console.log("Adding new minter.");
  //   await token.addNewMinter("0xfc35754091D1540cE605Db87e5284369D766F0bF");
  //   console.log("Removing old minter");
  //   await token.removeMinter("0xC0349e63C1250b408eA11F5492D70A8E5e202B93");
  //   console.log("Done.");
  // }
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
