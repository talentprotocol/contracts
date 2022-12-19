import { ethers, upgrades } from "hardhat";
import crypto from "crypto";
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
    "0x529872baCcfeeA84d43Cea2f0c4b3C38bBA45ce1",
    TalentNFT.abi,
    owner
  );


  for (let i = 0; i < 5; i++) {
    const uuid = crypto.randomUUID();
    let tx = await talentNFTContract
      .connect(owner)
      .whitelistCode(uuid, TIERS.CORE_TEAM);

    await tx.wait();
    console.log("Created a core team mint code: ", uuid);
  }

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
