import { ethers, network, } from "hardhat";
import { deployTalentRewardClaim } from "../shared";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";
import { createClient } from '@supabase/supabase-js'

import * as TalentRewardClaim from "../../artifacts/contracts/talent/TalentRewardClaim.sol/TalentRewardClaim.json";

// @TODO: add all safes and addresses that need to receive the tokens
const wallets = [
  "0xf9342d70a2a6eb46afd7b81138dee01d73b2e419",
  "0xc8b74c37bd25e6ca8cb6ddf2e01058c45d341182",
  "0x33041027dd8f4dc82b6e825fb37adf8f15d44053",
  "0x58a35cf59d5c630c057af008a78bc67cdc2ec094",
  "0x923b6bfc8cb0d9a57716a1340f7b86e8b678ecea",
  "0xf924efc8830bfa1029fa0cd7a51901a5ec03de3d",
  "0xa081e1da16133bb4ebc7aab1a9b0588a48d15138",
  "0xe3b35ff40263385159f5705ece0223ea81730692"
 ];

//  2471833440000000000000000

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

  // Consider limit of 1000 rows; sort
  const { data, error } = await supabase
    .from("distributions")
    .select("wallet, amount")
    .eq("vesting_category", "ecosystem_incentives_03")
    .in("wallet", wallets)

  console.log(data);

  if(error) {
    console.error(error);
    return 0;
  }

  if(!data || data.length == 0) {
    console.error("No data to process");
    return 0;
  }

  const [admin] = await ethers.getSigners();

  console.log("Calculating merkle tree");

  const leaves = data.map((leave) => [
    leave.wallet,
    ethers.utils.parseEther(leave.amount.toFixed(2).toString()),
  ]);

  console.log("Leaves", leaves);

  const merkleTree = StandardMerkleTree.of(leaves, ["address", "uint256"]);

  console.log("Dumping tree to file");

  fs.writeFileSync("./merkeTreeForRewardClaiming.json", JSON.stringify(merkleTree.dump(), (key, value) =>
    typeof value === 'bigint'
        ? value.toString()
        : value
  ));

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
      .eq("vesting_category", "ecosystem_incentives_03")

    if(error) {
      console.error(error);
    }
  }

  console.log("Deploying...");
  console.log(`Admin will be ${admin.address}`);

  const talentAddress = "" // Talent Token Address
  const builderScoreAddress = "" // Builder Score Contract Address
  const holdingWalletAddress = "" // Holding Wallet Address
  
  console.log(`Contract init args: ${talentAddress} ${builderScoreAddress} ${holdingWalletAddress} ${admin.address} ${merkleTree.root}`)

  const talentRewardClaim = await deployTalentRewardClaim(
    talentAddress, 
    builderScoreAddress,
    holdingWalletAddress, 
    admin.address,
    merkleTree.root
  );

  console.log(`Talent Reward Claim Address: ${talentRewardClaim.address}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
