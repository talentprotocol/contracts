import axios from "axios";
import { ethers } from "hardhat";
import { NFTStorage } from "nft.storage";
import * as TalentNFT from "../artifacts/contracts/talent-nft/TalentNFT.sol/TalentNFT.json";

const client = new NFTStorage({ token: "..." });

const TOKENS_TO_UPDATE = Array.from({length: 550 }, (_, i) => i + 1);
const TOKENS_THAT_FAILED_TO_UPDATE: number[] = [];
const UNREVEALED_TOKENS: number[] = [];

(async () => {
  const [owner] = await ethers.getSigners();
  
  const talentNFTContract = new ethers.Contract(
    "...",
    TalentNFT.abi,
    owner
  );

  async function main(TOKEN_ID_TO_UPDATE: number) {
    const result = await talentNFTContract.tokenURI(TOKEN_ID_TO_UPDATE);
    const TOKEN_OWNER_WALLET = await talentNFTContract.ownerOf(TOKEN_ID_TO_UPDATE);
    const parsedURL = result.split("/")[2];
    return axios(`https://${parsedURL}.ipfs.dweb.link/metadata.json`)
      .then(async ({data}) => {
        console.log("- current metadata:");
        console.log(data);
        const fileName = data.image.split("/")[3];
        console.log("- clearing tokenuri");
        await talentNFTContract.clearTokenURI(TOKEN_ID_TO_UPDATE);
        const newCommunityLevel = await talentNFTContract.checkAccountOrCodeTier(TOKEN_OWNER_WALLET, "");
        if (data.attributes[0]["trait_type"] === "No") {
          UNREVEALED_TOKENS.push(TOKEN_ID_TO_UPDATE);
          throw `ERROR::: This Mate is unrevealed - TOKEN_ID: ${TOKEN_ID_TO_UPDATE}`;
        }
        if (data.attributes[data.attributes.length  -1]["trait_type"] !== "Community Level") {
          TOKENS_THAT_FAILED_TO_UPDATE.push(TOKEN_ID_TO_UPDATE);
          throw `ERROR::: Not changing Community Level --- CHANGING TRAIT ${data.attributes[data.attributes.length  -1]["trait_type"]} instead`;
        }
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
        console.log(`ERROR on token ${TOKEN_ID_TO_UPDATE} from ${TOKEN_OWNER_WALLET}`);
        console.log(err);
      });
  }
  for (let i = 0; i < TOKENS_TO_UPDATE.length; i++) {
    console.log(`-> updating token ${TOKENS_TO_UPDATE[i]}`);
    await main(TOKENS_TO_UPDATE[i]);
  }

  console.log("-----------------");
  console.log("Tokens that failed to update:");
  console.log(TOKENS_THAT_FAILED_TO_UPDATE);
  console.log("Unrevealed tokens:");
  console.log(UNREVEALED_TOKENS);
  console.log("-----------------");
})();
