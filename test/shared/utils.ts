import { ethers, network } from "hardhat";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractReceipt, ContractTransaction, Event } from "ethers";
import { BigNumber } from "ethers";

export async function findEvent(tx: ContractTransaction, name: string): Promise<Event | undefined> {
  const receipt: ContractReceipt = await tx.wait();

  return receipt.events?.find((e) => {
    return e.event === name;
  });
}

// We can't currently call ERC1363 functions directly, because they make use of
// overloaded functions, which ethers-v5 doesn't play well with.
// https://github.com/ethers-io/ethers.js/issues/119#issuecomment-861024418
export async function transferAndCall(
  token: any,
  from: SignerWithAddress,
  to: string,
  amount: BigNumber,
  data: any
): Promise<any> {
  if (data) {
    return token.connect(from)["transferAndCall(address,uint256,bytes)"](to, amount, data);
  } else {
    return token.connect(from)["transferAndCall(address,uint256)"](to, amount);
  }
}

const ONE = ethers.BigNumber.from(1);
const TWO = ethers.BigNumber.from(2);

export function sqrt(value: BigNumber): BigNumber {
  const x = BigNumber.from(value);
  let z = x.add(ONE).div(TWO);
  let y = x;
  while (z.sub(y).isNegative()) {
    y = z;
    z = x.div(z).add(z).div(TWO);
  }
  return y;
}

export function ensureTimestamp(timestamp: number): Promise<unknown> {
  return network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
}
