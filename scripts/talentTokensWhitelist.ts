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

  const provider = new ethers.providers.JsonRpcProvider("https://rpc-mainnet.maticvigil.com/");

  console.log("Starting");

  const feeData = await provider.getFeeData();

  console.log("FEE ESTIMATED. WHITELISTING");

  let tx = await talentNFTContract
    .connect(owner)
    .whitelistAddress("0xe9b692a637260522ff915d47b8eb1aedf9c5d6fb", TIERS.TALENT, {
      gasPrice: feeData.gasPrice?.mul(120).div(100)
    });

  console.log("waiting");
  console.log(tx);

  await tx.wait();


  console.log("done.")
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
