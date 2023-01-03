import fetch from "node-fetch";
import { File } from "nft.storage";
import axios from "axios";
import { ethers } from "hardhat";
import { NFTStorage } from "nft.storage";
import * as TalentNFT from "../artifacts/contracts/talent-nft/TalentNFT.sol/TalentNFT.json";

const client = new NFTStorage({ token: "..." });

const TOKENS_TO_UPDATE = [24];
const TOKENS_THAT_FAILED_TO_UPDATE: number[] = [];
const UNREVEALED_TOKENS: number[] = [];
const OLD_METADATA: any = [];

const ACCOUNT_TIER_MAP = {
	"2": "11",
	"3": "12",
	"4": "24",
	"5": "22",
	"6": "21",
	"7": "23",
	"8": "23",
	"9": "23",
	"10": "31",
	"11": "32",
	"12": "41",
};

const accountTierToCommunityLevelConverter = (accountTier: number) => {
	// @ts-ignore
	return ACCOUNT_TIER_MAP[accountTier] || "1";
};

const provider = new ethers.providers.JsonRpcProvider("https://rpc-mainnet.maticvigil.com/");

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
        OLD_METADATA.push(data);
        console.log("- current metadata:");
        console.log(data);
        const fileName = data.image.split("/")[3];
        const newCommunityLevel = accountTierToCommunityLevelConverter(await talentNFTContract.checkAccountOrCodeTier(TOKEN_OWNER_WALLET, ""));
        if (data.attributes[0]["trait_type"] === "Revealed" && data.attributes[0]["value"] === "No") {
          UNREVEALED_TOKENS.push(TOKEN_ID_TO_UPDATE);
          console.warn(`WARNING::: This Mate is unrevealed - TOKEN_ID: ${TOKEN_ID_TO_UPDATE}`);
          return;
        }
        if (data.attributes[data.attributes.length  -1]["trait_type"] !== "Community Level") {
          TOKENS_THAT_FAILED_TO_UPDATE.push(TOKEN_ID_TO_UPDATE);
          throw `ERROR::: Not changing Community Level --- CHANGING TRAIT ${data.attributes[data.attributes.length  -1]["trait_type"]} instead`;
        }
        data.attributes[data.attributes.length  -1].value = newCommunityLevel;
        const image = await fetch(`https://talentprotocol-mintingpage-qa.s3.eu-west-2.amazonaws.com/mates/${TOKEN_ID_TO_UPDATE}.png`);
        const imageBuffer = await image.buffer();

        const imageFile = new File([imageBuffer], fileName, {
          type: "image/png"
        });
        
        console.log("- new metadata to store:")
        data.image = imageFile;
        console.log(data);
        const metadata = await client.store(data);
		    const feeData = await provider.getFeeData();
        console.log("- clearing tokenuri");
        const tx = await talentNFTContract.clearTokenURI(TOKEN_ID_TO_UPDATE);
        await tx.wait();
        console.log("- setting tokenuri");
        await talentNFTContract
          .connect(owner)
          .setTokenURI(
            TOKEN_ID_TO_UPDATE,
            metadata.url,
            fileName,
            TOKEN_OWNER_WALLET,
            0,
            {
              gasPrice: feeData.gasPrice?.mul(5),
            }
          );
        console.log("SUCCESS");
      })
      .catch(err => {
        TOKENS_THAT_FAILED_TO_UPDATE.push(TOKEN_ID_TO_UPDATE);
        console.log(`ERROR on token ${TOKEN_ID_TO_UPDATE} from ${TOKEN_OWNER_WALLET}`);
        console.log(err);
        process.exit(1);
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