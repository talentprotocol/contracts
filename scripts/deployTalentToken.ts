import { ethers, upgrades, waffle } from "hardhat";
import * as FactoryArtifactV2 from "../artifacts/contracts/TalentFactoryV2.sol/TalentFactoryV2.json";
import * as TalentTokenArtifactV2 from "../artifacts/contracts/test/TalentTokenV2.sol/TalentTokenV2.json";
import { UpgradeableBeacon__factory } from "../typechain-types";

const { exit } = process;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  const provider =  new ethers.providers.JsonRpcProvider("https://alfajores-forno.celo-testnet.org");

  // console.log("owner wallet: ", owner.address);

  // const factory = new ethers.Contract(
  //   "0x8ee4f3044Ef0166A6DB12b0e9Eeb1735f1Fc7cc9",
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

  const allTokens: any = [];
    
  for await (const item of allTokens) {
    const token = new ethers.Contract(
      item,
      TalentTokenArtifactV2.abi,
      owner
    )

    console.log("Migrating token: ", await token.symbol());

    console.log("Adding new minter.");
    await token.addNewMinter("0xfc35754091D1540cE605Db87e5284369D766F0bF");
    console.log("Removing old minter");
    await token.removeMinter("0xC0349e63C1250b408eA11F5492D70A8E5e202B93");
    console.log("Done.");
  }
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
