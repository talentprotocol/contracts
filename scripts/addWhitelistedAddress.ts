import { ethers, upgrades } from "hardhat";
import * as TalentNFT from "../artifacts/contracts/talent-nft/TalentNFT.sol/TalentNFT.json";

const { exit } = process;

enum TIERS {
  UNDEFINED,
  PUBLIC_STAGE,
  USER,
  TALENT_HOUSE,
  PARTNER,
  TOKEN_HOLDER,
  TALENT,
  INVESTOR_WINTER,
  INVESTOR_FALL,
  INVESTOR_SUMMER,
  CONTRIBUTOR,
  ACTIVE_CONTRIBUTOR,
  CORE_TEAM
}

async function main() {
  const [owner] = await ethers.getSigners();
  
  const talentNFTContract = new ethers.Contract(
    "0xc905AF9E75e7b42330f5fA3176998cbe4927eFF2",
    TalentNFT.abi,
    owner
  );


  const URI = await talentNFTContract.tokenURI(1);

  console.log(URI);

  // const tx = await talentNFTContract
  //   .connect(owner)
  //   .whitelistAddress("0x0914543c9716D8A4811187a78606A50cA81B9C14", TIERS.CORE_TEAM);

  // await tx.wait();

  // const tx2 = await talentNFTContract
  //   .connect(owner)
  //   .whitelistAddress("0x33041027dd8F4dC82B6e825FB37ADf8f15d44053", TIERS.CORE_TEAM);

  // await tx2.wait();

  console.log("Added a new address")
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
