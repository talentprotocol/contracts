import { ethers, upgrades } from "hardhat";
import { getImplementationAddress } from '@openzeppelin/upgrades-core';
import * as FactoryArtifact from "../artifacts/contracts/TalentFactory.sol/TalentFactory.json";
import * as FactoryArtifactV2 from "../artifacts/contracts/TalentFactoryV2.sol/TalentFactoryV2.json";


const { exit } = process;

async function main() {
  const [francisco, fred] = await ethers.getSigners();

  console.log("Francisco: ", francisco.address);
  console.log("Fred: ", fred.address);
  

  const provider =  new ethers.providers.JsonRpcProvider("https://alfajores-forno.celo-testnet.org");

  const currentImplAddress = await getImplementationAddress(provider, "0x1b0e6584Caf81f1cBca7Fb390192aAa192074C4d");

  console.log("Implementation address: ", currentImplAddress);

  const factory = new ethers.Contract(
    "0x1b0e6584Caf81f1cBca7Fb390192aAa192074C4d",
    FactoryArtifact.abi,
    francisco
  )
  
  console.log("Factory minter is: ", await factory.ROLE_MINTER());
  console.log("Factory Signer: ", await factory.signer.getAddress());

  // await factory.connect(francisco).setMinter("0xc8B74c37Bd25E6ca8CB6DDf2E01058C45D341182") // Set ruben's wallet as minter of factory V1

  // console.log("Factory minter is: ", await factory.ROLE_MINTER());

  const TalentFactoryV2Factory = await ethers.getContractFactory("TalentFactoryV2", francisco);

  // console.log("New implementation address: ", newImplementation.address);
  // console.log("Upgrade Signer: ", await TalentFactoryV2Factory.signer.getAddress());

  const factoryV2 = await upgrades.upgradeProxy(factory, TalentFactoryV2Factory);

  // console.log("Factory address: ", factory.address);

  // const factory2ImplAddr = await upgrades.prepareUpgrade(factory.address, newImplementation);

  // console.log("Implementation address: ", factory2ImplAddr);

  // TalentFactoryV2Factory.attach(factory2ImplAddr);

  // await factory.upgradeTo(newImplementation.address);

  // console.log("Attached");

  await factoryV2.connect(francisco).transferMinter("0xfc35754091D1540cE605Db87e5284369D766F0bF");
  
  console.log("Staking address is: ", "0xfc35754091D1540cE605Db87e5284369D766F0bF");
  console.log("Factory2 minter is: ", await factory.ROLE_MINTER());
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
