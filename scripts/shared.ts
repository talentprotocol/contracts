import { ethers } from "hardhat";

import type { BigNumber } from "ethers";
import type { TalentProtocol, TalentFactory, Staking, CommunityLevelOne } from "../typechain";

export async function deployToken(): Promise<TalentProtocol> {
  const TalentProtocol = await ethers.getContractFactory("TalentProtocol");

  const tal = await TalentProtocol.deploy();
  await tal.deployed();

  return tal as TalentProtocol;
}

export async function deployFactory(): Promise<TalentFactory> {
  const TalentFactory = await ethers.getContractFactory("TalentFactory");

  const factory = await TalentFactory.deploy();
  await factory.deployed();

  return factory as TalentFactory;
}

export async function deployLevelOne(owner: string): Promise<CommunityLevelOne> {
  const CommunityLevelOneDeployer = await ethers.getContractFactory("CommunityLevelOne");

  const community = await CommunityLevelOneDeployer.deploy(owner);
  await community.deployed();

  return community as CommunityLevelOne;
}

export async function deployStaking(
  start: number,
  end: number,
  rewardMax: BigNumber,
  stableCoin: string,
  factory: string,
  protocolPrice: BigNumber,
  talentPrice: BigNumber
): Promise<Staking> {
  const Staking = await ethers.getContractFactory("Staking");

  const staking = await Staking.deploy(start, end, rewardMax, stableCoin, factory, protocolPrice, talentPrice);
  await staking.deployed();

  return staking as Staking;
}
