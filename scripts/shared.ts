import { ethers, upgrades } from "hardhat";

import type { BigNumber } from "ethers";
import type {
  TalentProtocol,
  TalentFactory,
  Staking,
  CommunityUser,
  TalentNFT,
  TalentSponsorship,
  VirtualTALBuy,
  PassportRegistry,
} from "../typechain-types";

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

export async function deployLevelOne(owner: string, ticker: string): Promise<CommunityUser> {
  const CommunityUserDeployer = await ethers.getContractFactory("CommunityUser");

  const community = await CommunityUserDeployer.deploy(owner, ticker);
  await community.deployed();

  return community as CommunityUser;
}

export async function deployMemberLevelOne(owner: string, ticker: string): Promise<CommunityUser> {
  const CommunityMemberDeployer = await ethers.getContractFactory("CommunityMember");

  const community = await CommunityMemberDeployer.deploy(owner, ticker);
  await community.deployed();

  return community as CommunityUser;
}

export async function deployTalentNFT(owner: string, ticker: string): Promise<TalentNFT> {
  const talentNFTContract = await ethers.getContractFactory("TalentNFT");

  const deployedTalentNFT = await talentNFTContract.deploy(owner, ticker);
  await deployedTalentNFT.deployed();

  return deployedTalentNFT as TalentNFT;
}

export async function deploySponsorship(owner: string): Promise<TalentSponsorship> {
  const talentSponsorshipContract = await ethers.getContractFactory("TalentSponsorship");

  const deployedSponsorshipContract = await talentSponsorshipContract.deploy(owner);
  await deployedSponsorshipContract.deployed();

  return deployedSponsorshipContract as TalentSponsorship;
}

export async function deployVirtualTalBuy(
  owner: string,
  safeAddress: string,
  stableAddress: string
): Promise<VirtualTALBuy> {
  const virtualTalBuyContract = await ethers.getContractFactory("VirtualTALBuy");

  const deployedVirtualTalBuy = await virtualTalBuyContract.deploy(owner, safeAddress, stableAddress);
  await deployedVirtualTalBuy.deployed();

  return deployedVirtualTalBuy as VirtualTALBuy;
}

export async function deployPassport(owner: string): Promise<PassportRegistry> {
  const passportRegistryContract = await ethers.getContractFactory("PassportRegistry");

  const deployedPassport = await passportRegistryContract.deploy(owner);
  await deployedPassport.deployed();

  return deployedPassport as PassportRegistry;
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

  const staking = await upgrades.deployProxy(Staking, [
    start,
    end,
    rewardMax,
    stableCoin,
    factory,
    protocolPrice,
    talentPrice,
  ]);
  await staking.deployed();

  return staking as Staking;
}
