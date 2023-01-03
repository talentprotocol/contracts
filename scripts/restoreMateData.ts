import fetch from "node-fetch";
import { File } from "nft.storage";
import { ethers } from "hardhat";
import { NFTStorage } from "nft.storage";
import * as TalentNFT from "../artifacts/contracts/talent-nft/TalentNFT.sol/TalentNFT.json";

const client = new NFTStorage({ token: "..." });

const MATE_ID = 500;
const FILE_NAME = "male-11-23-5-10-8-3-2-12.png";
const MATE_DATA = {
  name: 'Talent Mate 500',
  description: 'Talent Mates. An NFT collection by Talent Protocol.',
  properties: { type: 'image' },
  attributes: [
    { trait_type: 'Background', value: 'Eucalyptus Green' },
    {
      trait_type: 'Background Object',
      value: 'Purple Electric Guitar'
    },
    { trait_type: 'Skin', value: 'User - Mint Color' },
    { trait_type: 'Clothes', value: 'Purple Talent Tee' },
    { trait_type: 'Hair', value: 'Talent Buckethat' },
    { trait_type: 'Mouth', value: 'Pouting' },
    { trait_type: 'Eyes', value: 'Monocle' },
    { trait_type: 'Thinking', value: 'GPU' },
    { trait_type: 'Revealed', value: 'Yes' },
    { trait_type: 'Body', value: 1 },
    { trait_type: 'Community Level', value: 11 }
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
        console.log("- setting tokenuri");
        await talentNFTContract
          .connect(owner)
          .setTokenURI(
            MATE_ID,
            metadata.url,
            FILE_NAME,
            TOKEN_OWNER_WALLET,
            0,
            {
              gasPrice: feeData.gasPrice?.mul(5),
            }
          );
        console.log("SUCCESS");
      }
  main();
})();