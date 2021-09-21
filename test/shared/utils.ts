import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractReceipt, ContractTransaction, Event } from "ethers";
import type { BigNumber } from "ethers";

import { TalentToken } from "../../typechain/TalentToken";
import { TalentFactory } from "../../typechain/TalentFactory";
import { TalentToken__factory } from "../../typechain/factories/TalentToken__factory";

export async function findEvent(tx: ContractTransaction, name: string): Promise<Event | undefined> {
  const receipt: ContractReceipt = await tx.wait();

  return receipt.events?.find((e) => e.event === name);
}

export async function deployTalentToken(
  factory: TalentFactory,
  minter: SignerWithAddress,
  owner: SignerWithAddress
): Promise<TalentToken> {
  const tx = await factory.connect(minter).createTalent(owner.address, "Miguel Palhas", "NAPS");
  const event = await findEvent(tx, "TalentCreated");

  const address = event?.args?.token;

  return TalentToken__factory.connect(address, minter);
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
