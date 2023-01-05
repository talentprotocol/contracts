import axios from "axios";
import { ethers } from "hardhat";
import * as TalentNFT from "../artifacts/contracts/talent-nft/TalentNFT.sol/TalentNFT.json";

(async () => {
  const [owner] = await ethers.getSigners();
  
  const talentNFTContract = new ethers.Contract(
    "...",
    TalentNFT.abi,
    owner
  );
  const result = await talentNFTContract.tokenURI(323);
  const parsedURL = result.split("/")[2];
  const { data } = await axios(`https://${parsedURL}.ipfs.dweb.link/metadata.json`);
  console.log(data);
})()