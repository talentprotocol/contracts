import fetch from "node-fetch";
import { File } from "nft.storage";
import { ethers } from "hardhat";
import { NFTStorage } from "nft.storage";
import * as TalentNFT from "../artifacts/contracts/talent-nft/TalentNFT.sol/TalentNFT.json";

const client = new NFTStorage({ token: "..." });

const MATE_ID = 475;
const FILE_NAME = "female-6-6-1-x-12-5-6-3.png";
const MATE_DATA = {  
  name: 'Talent Mate 475',
  description: 'Talent Mates. An NFT collection by Talent Protocol.',
  properties: { type: 'image' },
  attributes: [
    { trait_type: 'Background', value: 'Cream' },
    { trait_type: 'Background Object', value: 'Flower Bouquet' },
    { trait_type: 'Skin', value: 'User - Pink Color' },
    { trait_type: 'Clothes', value: 'Dark Tuxedo' },
    { trait_type: 'Mouth', value: 'Grinning' },
    { trait_type: 'Eyes', value: 'Round Sunglasses' },
    { trait_type: 'Thinking', value: 'Heart' },
    { trait_type: 'Revealed', value: 'Yes' },
    { trait_type: 'Body', value: 2 },
    { trait_type: 'Community Level', value: '22' }
  ],
  image: null
}


const provider = new ethers.providers.JsonRpcProvider("https://rpc-mainnet.maticvigil.com/");

(async () => {
  const [owner] = await ethers.getSigners();
  
  const talentNFTContract = new ethers.Contract(
    "...",
    TalentNFT.abi,
    owner
  );

  async function main() {
        const TOKEN_OWNER_WALLET = await talentNFTContract.ownerOf(MATE_ID);
        const image = await fetch(`https://talentprotocol-mintingpage-qa.s3.eu-west-2.amazonaws.com/mates/${MATE_ID}.png`);
        const imageBuffer = await image.buffer();
        const imageFile = new File([imageBuffer], FILE_NAME, {
          type: "image/png"
        });
        console.log("- new metadata to store:")
        MATE_DATA.image = imageFile as any;
        console.log(MATE_DATA);
        //@ts-ignore
        const metadata = await client.store(MATE_DATA);
		    const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice?.mul(5);
        console.log(`- setting tokenuri with gas price: ${gasPrice}`);
        await talentNFTContract
          .connect(owner)
          .setTokenURI(
            MATE_ID,
            metadata.url,
            FILE_NAME,
            TOKEN_OWNER_WALLET,
            0,
            {
              gasPrice
            }
          );
        console.log("SUCCESS");
      }
  main();
})();