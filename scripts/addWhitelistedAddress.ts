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
    "0x529872baccfeea84d43cea2f0c4b3c38bba45ce1",
    TalentNFT.abi,
    owner
  );
  const provider = new ethers.providers.JsonRpcProvider("https://rpc-mainnet.maticvigil.com/");

  const public_keys = [""];

  for (let i = 0; i < public_keys.length; i++) {
    console.log("ACCOUNT --- ", public_keys[i])
    const result = await talentNFTContract.checkAccountOrCodeTier(public_keys[i], "");

    if (result > 0) {
      console.log("This account is whitelisted already")
      console.log(result);
      continue;
    }

    const feeData = await provider.getFeeData();

    let tx = await talentNFTContract
      .connect(owner)
      .whitelistCode(public_keys[i], 0, {
        gasPrice: feeData.gasPrice?.mul(2)
      });

    console.log(tx.hash);

    tx.wait()

    console.log("FEE ESTIMATED. WHITELISTING..");

    tx = await talentNFTContract
      .connect(owner)
      .whitelistAddress(public_keys[i], 2, {
        gasPrice: feeData.gasPrice?.mul(2)
      });

    console.log(tx.hash);

    await tx.wait();
    console.log("done");
  }

  console.log("done.")
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
