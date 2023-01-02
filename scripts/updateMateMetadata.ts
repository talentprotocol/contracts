import axios from "axios";
import { ethers } from "hardhat";
import { NFTStorage } from "nft.storage";
import * as TalentNFT from "../artifacts/contracts/talent-nft/TalentNFT.sol/TalentNFT.json";

const client = new NFTStorage({ token: "..." });

const USERS_TO_UPDATE = [{
  tokenId: 0,
  wallet: "..."
}];

(async () => {
  const [owner] = await ethers.getSigners();
  
  const talentNFTContract = new ethers.Contract(
    "...",
    TalentNFT.abi,
    owner
  );


  async function main(TOKEN_ID_TO_UPDATE: number, TOKEN_OWNER_WALLET: string) {
    const result = await talentNFTContract.tokenURI(TOKEN_ID_TO_UPDATE);
    const parsedURL = result.split("/")[2];
    return axios(`https://${parsedURL}.ipfs.dweb.link/metadata.json`)
      .then(async ({data}) => {
        console.log("- current metadata:");
        console.log(data);
        const fileName = data.image.split("/")[3];
        console.log("- clearing tokenuri");
        await talentNFTContract.clearTokenURI(TOKEN_ID_TO_UPDATE);
        const newCommunityLevel = await talentNFTContract.checkAccountOrCodeTier(TOKEN_OWNER_WALLET, "");
        data.attributes[data.attributes.length  -1].value = newCommunityLevel;
        console.log("- new metadata to store:")
        console.log(data);
        const metadata = await client.store(data);
        console.log("- setting tokenuri");
        await talentNFTContract
          .connect(owner)
          .setTokenURI(
            TOKEN_ID_TO_UPDATE,
            metadata.url,
            fileName,
            TOKEN_OWNER_WALLET,
            0
          );
        console.log("SUCCESS");
      })
      .catch(err => {
        console.log("ERROR");
        console.log(err)
      });
  }
  for (let i = 0; i < USERS_TO_UPDATE.length; i++) {
    console.log(`-> updating token ${USERS_TO_UPDATE[i].tokenId}`);
    await main(USERS_TO_UPDATE[i].tokenId, USERS_TO_UPDATE[i].wallet);
  }
})();
