import { ethers } from "hardhat";

import type { Contract } from "ethers";

export async function deployToken(): Promise<Contract> {
  const TalentProtocol = await ethers.getContractFactory("TalentProtocol");

  const tal = await TalentProtocol.deploy();

  await tal.deployed();

  return tal;
}
