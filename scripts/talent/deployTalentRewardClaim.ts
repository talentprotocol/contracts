import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { deployTalentRewardClaim } from "../shared";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";

// @TODO: add all safes and addresses that need to receive the tokens
const snapshot = { 
  "0x0": "0",
} as Record<string, string>;

async function main() {
  console.log(`Deploying Talent Reward Claim at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const talentRewardClaim = await deployTalentRewardClaim(
    "0x0", // Talent Token Address
    "0x0", // Builder Score Contract Address
    "0x0", // Holding Wallet Address
    admin.address
  );

  console.log(`Talent Reward Claim Address: ${talentRewardClaim.address}`);

  console.log("Calculating merkle tree");

  const leaves = Object.keys(snapshot).map((address) => [
    address,
    ethers.utils.parseEther(snapshot[address]),
  ]);

  const merkleTree = StandardMerkleTree.of(leaves, ["address", "uint256"]);

  console.log("Writing merkle trees to file")

  fs.writeFileSync("./data/merkeTreeForRewardClaiming.json", JSON.stringify(merkleTree.dump(), (key, value) =>
    typeof value === 'bigint'
        ? value.toString()
        : value
  ));

  await talentRewardClaim.connect(admin).setMerkleRoot(merkleTree.root);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
