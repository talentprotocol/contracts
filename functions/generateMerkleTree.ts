import { BigNumber } from "ethers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

type BalanceMap = {
  [key: string]: BigNumber;
};

export default function (snapshot: BalanceMap): StandardMerkleTree<(string | BigNumber)[]> {
  const leaves = Object.keys(snapshot).map((address) => [address, snapshot[address]]);

  console.log(`Leaves`, leaves);
  return StandardMerkleTree.of(leaves, ["address", "uint256"]);
}
