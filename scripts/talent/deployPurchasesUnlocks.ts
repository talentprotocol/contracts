import { ethers, network } from "hardhat";
import { deployTalentTGEUnlock } from "../shared";
import fs from "fs";

import { BigNumberish } from "ethers";

import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

import distributionSetup from "../data/inAppPurchases.json";
import { createClient } from "@supabase/supabase-js";

const TALENT_TOKEN_ADDRESS_TESTNET =  "0xb669707B3784B1284f6B6a398f6b04b1AD78C74E";
const TALENT_TOKEN_ADDRESS_MAINNET =  "0xb669707B3784B1284f6B6a398f6b04b1AD78C74E";

const VESTING_CATEGORY = "ecosystem_incentives_02"

type BalanceMap = {
  [key: string]: BigNumberish;
};

function generateMerkleTree(snapshot: BalanceMap): StandardMerkleTree<(string | BigNumberish)[]> {
  const leaves = Object.keys(snapshot).map((address) => [address, snapshot[address]]);

  return StandardMerkleTree.of(leaves, ["address", "uint256"]);
}

async function main() {
  console.log(`Deploying TGE Unlocks at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  if(!process.env.PUBLIC_SUPABASE_URL) {
    console.error("Missing PUBLIC_SUPABASE_URL");
    return 0;
  }

  if(!process.env.PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Missing PUBLIC_SUPABASE_ANON_KEY");
    return 0;
  }

  const allResults = distributionSetup as { amount: string; wallet: string }[];

  const merkleBase = allResults.reduce((acc, { wallet, amount }) => {
    acc[wallet.toLowerCase()] = ethers.utils.parseEther(amount).toBigInt();
    return acc;
  }, {} as Record<string, bigint>);

  const merkleTree = generateMerkleTree(merkleBase);
  console.log("Generated merkle trees: ", merkleTree.root);
  const tgeUnlockDistribution = await deployTalentTGEUnlock(TALENT_TOKEN_ADDRESS_TESTNET, admin.address, merkleTree.root);

  console.log(`TGE Unlock distribution deployed at ${tgeUnlockDistribution.address}`);
  const proofList = allResults.map(({ wallet, amount }) => {
    const value = ethers.utils.parseEther(amount);
    const proof = merkleTree.getProof([wallet.toLowerCase(), value]);
    return {
      wallet,
      value,
      proof,
    };
  });

  console.log("Writing proofs to file");
  fs.writeFileSync(
    "./data/inAppPutchasesProofs.json",
    JSON.stringify(proofList, (key, value) => (typeof value === "bigint" ? value.toString() : value))
  );

  console.log("Uploading proofs to database");

  const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_ANON_KEY)

  const proofsCount = proofList.length
  for (let i = 0; i < proofsCount; i++) {
    const element = proofList[i]

    console.log(`Uploading ${i + 1}/${proofsCount}: ${element.wallet}`)

    const { error } = await supabase
      .from("distributions")
      .update({ proof: element.proof })
      .eq("wallet", element.wallet)
      .eq("vesting_category", VESTING_CATEGORY)

    if(error) {
      console.error(error);
    }
  }


  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
