import { ethers } from "hardhat";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractReceipt, ContractTransaction, Event } from "ethers";
import { BigNumber } from "ethers";

import type { TalentToken, TalentFactory } from "../../typechain";
import { TalentToken__factory } from "../../typechain";

export async function findEvent(tx: ContractTransaction, name: string): Promise<Event | undefined> {
  const receipt: ContractReceipt = await tx.wait();

  return receipt.events?.find((e) => {
    return e.event === name;
  });
}

export async function deployTalentToken(
  factory: TalentFactory,
  minter: SignerWithAddress,
  owner: SignerWithAddress,
  name: string,
  symbol: string
): Promise<TalentToken> {
  const tx = await factory.connect(minter).createTalent(owner.address, name, symbol);
  const event = await findEvent(tx, "TalentCreated");

  const address = event?.args?.token;

  return TalentToken__factory.connect(address, minter) as TalentToken;
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
