import { ethers, network } from "hardhat";
import { deployTalentTGEUnlock } from "../shared";
import fs from "fs";

import { BigNumberish } from "ethers";

import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

import distributionSetup from "../data/intractRewards.json";

const TALENT_TOKEN_ADDRESS_TESTNET =  "0xb669707B3784B1284f6B6a398f6b04b1AD78C74E";
const TALENT_TOKEN_ADDRESS_MAINNET =  "0x9a33406165f562E16C3abD82fd1185482E01b49a";

const BUILDER_SCORE_ADDRESS_MAINNET = "0xBBFeDA7c4d8d9Df752542b03CdD715F790B32D0B"

const MINIMUM_CLAIM_BUILER_SCORE = 40;

const VESTING_CATEGORY = "summer_builderdrop"

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

  const allResults = distributionSetup as { amount: string; wallet: string }[];

  console.log("Generate merkle tree");

  const merkleBase = allResults.reduce((acc, { wallet, amount }) => {
    acc[wallet.toLowerCase()] = ethers.utils.parseEther(amount).toBigInt();
    return acc;
  }, {} as Record<string, bigint>);

  const merkleTree = generateMerkleTree(merkleBase);

  console.log("Generate proof list");

  let index = 0;
  let fileIndex = 0;
  fs.writeFileSync(`scripts/data/intract-reward-proofs-${fileIndex}.json`, "[")

  const proofList = allResults.map(({ wallet, amount }) => {
    const value = ethers.utils.parseEther(amount).toBigInt();
    const proof = merkleTree.getProof([wallet.toLowerCase(), value]);

    index += 1;

    if(index % 20000 == 0) {
      fs.appendFileSync(`scripts/data/intract-reward-proofs-${fileIndex}.json`, "]")
      fileIndex +=1
      fs.writeFileSync(`scripts/data/intract-reward-proofs-${fileIndex}.json`, "[")
    }

    const message = JSON.stringify({wallet, proof})

    fs.appendFileSync(`scripts/data/intract-reward-proofs-${fileIndex}.json`, `${message},\n`)
    
    return {
      wallet,
      proof,
    };
  });

  fs.appendFileSync(`scripts/data/intract-reward-proofs-${fileIndex}.json`, "]")

  console.log(`Contract init args: ${TALENT_TOKEN_ADDRESS_MAINNET} ${merkleTree.root} ${BUILDER_SCORE_ADDRESS_MAINNET} ${MINIMUM_CLAIM_BUILER_SCORE} ${admin.address}`)

  const tgeUnlockDistribution = await deployTalentTGEUnlock(TALENT_TOKEN_ADDRESS_MAINNET, admin.address, merkleTree.root, BUILDER_SCORE_ADDRESS_MAINNET, MINIMUM_CLAIM_BUILER_SCORE);

  console.log(`TGE Unlock distribution deployed at ${tgeUnlockDistribution.address}`);

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
