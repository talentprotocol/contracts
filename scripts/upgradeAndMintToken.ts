import { ethers, network, upgrades, waffle } from "hardhat";
import StakingArtifact from "../artifacts/contracts/Staking.sol/Staking.json";
import TalentProtocolArtifact from "../artifacts/contracts/TalentProtocol.sol/TalentProtocol.json";
import TalentProtocolArtifactV2 from "../artifacts/contracts/test/TalentProtocolV2.sol/TalentProtocolV2.json";


const { exit } = process;
const { parseUnits } = ethers.utils;

async function main() {
  const [creator] = await ethers.getSigners();

  console.log("Loaded wallet public address: ", creator.address);

  const provider =  new ethers.providers.JsonRpcProvider("https://forno.celo.org");
  const tal = new ethers.Contract(
    "0x4f35C8A34BBdf66e953BdA3C84faD7c08C1B9676",
    TalentProtocolArtifactV2.abi,
    creator
  )

  const staking = new ethers.Contract(
    "0x8ea91a982d93836415CE3abbaf12d59fb8cE3Ff8",
    StakingArtifact.abi,
    provider
  )

  console.log("TAL contract signer: ",await tal.signer.getAddress());

  const TalentProtocolFactoryV2 = await ethers.getContractFactory("TalentProtocolV2", creator);
  
  console.log("Upgrade Signer: ", await TalentProtocolFactoryV2.signer.getAddress());

  // the code below will deploy a new implementation
  // const talv2 = await upgrades.upgradeProxy(tal.address, TalentProtocolFactoryV2);

  const talv2ImplAddr = await upgrades.prepareUpgrade(tal.address, TalentProtocolFactoryV2);

  console.log("Implementation address: ", talv2ImplAddr);

  TalentProtocolFactoryV2.attach(talv2ImplAddr);

  await tal.upgradeTo(talv2ImplAddr);

  console.log("Attached");
  console.log(await tal.version());

  const talAmount = parseUnits("1000000000");

  await tal.connect(creator).adminMint(talAmount);

  await tal.connect(creator).approve(staking.address, talAmount);

  // This part below requires changing the configured address to be the owner of the staking contract.
  // await tal.connect(creator).approve(staking.address, parseUnits("100000000"));
  // await staking.connect(creator).swapStableForToken(parseUnits("0.58"));

  // console.log((await staking.totalStableStored()).toString());
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
