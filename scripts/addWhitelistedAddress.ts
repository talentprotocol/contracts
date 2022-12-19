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
    "0xD3f121F2D4c27576a8C3054Fd952825Bd3A033d5",
    TalentNFT.abi,
    owner
  );

  for (let i = 0; i < 10; i++) {
    let tx = await talentNFTContract
      .connect(owner)
      .whitelistCode(`core-team-${i}`, TIERS.CORE_TEAM);

    await tx.wait();
    console.log("Created a core team mint code: ", `core-team-${i}`);
  }

  for (let i = 0; i < 10; i++) {
    let tx = await talentNFTContract
      .connect(owner)
      .whitelistCode(`talent-${i}`, TIERS.TALENT);

    await tx.wait();
    console.log("Created a talent mint code: ", `talent-${i}`);
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
