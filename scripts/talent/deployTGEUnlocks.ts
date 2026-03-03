import { ethers, network } from "hardhat";
import { deployTalentTGEUnlock } from "../shared";
import fs from "fs";

import { BigNumberish } from "ethers";

import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

type BalanceMap = {
  [key: string]: BigNumberish;
};

function generateMerkleTree(snapshot: BalanceMap): StandardMerkleTree<(string | BigNumberish)[]> {
  const leaves = Object.keys(snapshot).map((address) => [address, snapshot[address]]);

  return StandardMerkleTree.of(leaves, ["address", "uint256"]);
}

// @TODO: replace this with .csv export
const distributionSetup = [
  {
    wallet: "0x0",
    total: "1000000000",
  },
];

async function main() {
  console.log(`Deploying TGE Unlocks at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const allResults = distributionSetup as { total: string; wallet: string }[];

  const merkleBase = allResults.reduce((acc, { wallet, total }) => {
    acc[wallet.toLowerCase()] = ethers.utils.parseEther(total).toBigInt();
    return acc;
  }, {} as Record<string, bigint>);

  const merkleTree = generateMerkleTree(merkleBase);
  console.log("Generated merkle trees: ", merkleTree.root);
  const tgeUnlockDistribution = await deployTalentTGEUnlock("TALENT TOKEN ADDRESS", admin.address, merkleTree.root);

  console.log(`TGE Unlock distribution deployed at ${tgeUnlockDistribution.address}`);
  const proofList = allResults.map(({ wallet, total }) => {
    const value = ethers.utils.parseEther(total);
    const proof = merkleTree.getProof([wallet.toLowerCase(), value.toString()]);
    return {
      wallet,
      value,
      proof,
    };
  });

  console.log("Writing proofs to file");
  fs.writeFileSync(
    "./data/proofs.json",
    JSON.stringify(proofList, (key, value) => (typeof value === "bigint" ? value.toString() : value))
  );

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
