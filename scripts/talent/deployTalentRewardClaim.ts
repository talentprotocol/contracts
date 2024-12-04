import { ethers, network, } from "hardhat";
import { deployTalentRewardClaim } from "../shared";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";
import { createClient } from '@supabase/supabase-js'
import rewardDistributions  from "../data/rewardsDistribution.json";

const TALENT_TOKEN_ADDRESS_TESTNET =  "0xb669707B3784B1284f6B6a398f6b04b1AD78C74E";
const TALENT_TOKEN_ADDRESS_MAINNET =  "0x9a33406165f562E16C3abD82fd1185482E01b49a";

const BUILDER_SCORE_ADDRESS_TESTNET = "0x5f3aA689C4DCBAe505E6F6c8548DbD9b908bA71d"
const BUILDER_SCORE_ADDRESS_MAINNET = "0xBBFeDA7c4d8d9Df752542b03CdD715F790B32D0B"

const VESTING_CATEGORY = "ecosystem_incentives_03"

async function main() {
  console.log(`Deploying Talent Reward Claim at ${network.name}`);

  if(!process.env.PUBLIC_SUPABASE_URL) {
    console.error("Missing PUBLIC_SUPABASE_URL");
    return 0;
  }

  if(!process.env.PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Missing PUBLIC_SUPABASE_ANON_KEY");
    return 0;
  }

  const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_ANON_KEY)

  const [admin] = await ethers.getSigners();

  console.log("Calculating merkle tree");

  const leaves = rewardDistributions.map((distribution) => [
    distribution.wallet,
    ethers.utils.parseEther(distribution.amount),
  ]);

  console.log("Leaves", leaves);

  const merkleTree = StandardMerkleTree.of(leaves, ["address", "uint256"]);

  console.log("Dumping tree to file");

  fs.writeFileSync(`scripts/data/${VESTING_CATEGORY}-proofs.json`, JSON.stringify(merkleTree.dump(), (key, value) =>
    typeof value === 'bigint'
        ? value.toString()
        : value
  ));

  console.log("Deploying...");
  console.log(`Admin will be ${admin.address}`);

  const holdingWalletAddress = admin.address // Holding Wallet Address
  
  console.log(`Contract init args: ${TALENT_TOKEN_ADDRESS_TESTNET} ${BUILDER_SCORE_ADDRESS_TESTNET} ${holdingWalletAddress} ${admin.address} ${merkleTree.root}`)

  const talentRewardClaim = await deployTalentRewardClaim(
    TALENT_TOKEN_ADDRESS_TESTNET, 
    BUILDER_SCORE_ADDRESS_TESTNET,
    holdingWalletAddress, 
    admin.address,
    merkleTree.root
  );

  console.log(`Talent Reward Claim Address: ${talentRewardClaim.address}`);

  console.log("Uploading proofs to database");

  const walletProof = leaves.map((leave) => [
    leave[0],
    merkleTree.getProof(leave)
  ]);

  const proofsCount = walletProof.length
  for (let i = 0; i < proofsCount; i++) {
    const element = walletProof[i]

    console.log(`Uploading ${i + 1}/${proofsCount}: ${element[0]}`)

    const { error } = await supabase
      .from("distributions")
      .update({ proof: element[1] })
      .eq("wallet", element[0])
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
