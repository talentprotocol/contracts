import { ethers } from "hardhat";
import { zeroHash } from "viem";
import type {
  PassportRegistry,
  TalentProtocolToken,
  TalentRewardClaim,
  PassportBuilderScore,
  TalentCommunitySale,
  TalentTGEUnlock,
  SmartBuilderScore,
} from "../../typechain-types";
import { BigNumber } from "ethers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

export async function deployPassport(owner: string): Promise<PassportRegistry> {
  const passportRegistryContract = await ethers.getContractFactory("PassportRegistry");

  const deployedPassport = await passportRegistryContract.deploy(owner);
  await deployedPassport.deployed();

  return deployedPassport as PassportRegistry;
}

export async function deployTalentToken(owner: string): Promise<TalentProtocolToken> {
  const talentTokenContract = await ethers.getContractFactory("TalentProtocolToken");

  const deployedTalentToken = await talentTokenContract.deploy(owner);
  await deployedTalentToken.deployed();

  return deployedTalentToken as TalentProtocolToken;
}

export async function deployTalentRewardClaim(
  token: string,
  scoreContract: string,
  holdingWallet: string,
  owner: string,
  merkleRoot: string,
): Promise<TalentRewardClaim> {
  const talentRewardClaimContract = await ethers.getContractFactory("TalentRewardClaim");

  const deployedRewardClaim = await talentRewardClaimContract.deploy(
    token,
    scoreContract,
    holdingWallet,
    owner,
    merkleRoot
  );
  await deployedRewardClaim.deployed();

  return deployedRewardClaim as TalentRewardClaim;
}

export async function deployPassportBuilderScore(registry: string, owner: string): Promise<PassportBuilderScore> {
  const passportBuilderScoreContract = await ethers.getContractFactory("PassportBuilderScore");

  const deployedPassportBuilderScore = await passportBuilderScoreContract.deploy(registry, owner);
  await deployedPassportBuilderScore.deployed();

  return deployedPassportBuilderScore as PassportBuilderScore;
}

export async function deploySmartBuilderScore(
  owner: string,
  passportRegistry: string,
  feeReceiver: string,
  passportBuilderScore: string
): Promise<SmartBuilderScore> {
  const smartBuilderScoreContract = await ethers.getContractFactory("SmartBuilderScore");

  const deployedSmartBuilderScore = await smartBuilderScoreContract.deploy(
    owner,
    passportBuilderScore,
    passportRegistry,
    feeReceiver
  );
  await deployedSmartBuilderScore.deployed();

  return deployedSmartBuilderScore as SmartBuilderScore;
}

export async function deployTalentCommunitySale(
  owner: string,
  tokenAddress: string,
  decimals: number
): Promise<TalentCommunitySale> {
  const talentTokenContract = await ethers.getContractFactory("TalentCommunitySale");

  const deployedTalentToken = await talentTokenContract.deploy(
    owner,
    tokenAddress,
    "0xcAc42Ecd516AF7bBbd54B93D637332cEB34FE21D",
    decimals
  );
  await deployedTalentToken.deployed();

  return deployedTalentToken as TalentCommunitySale;
}

export async function deployTalentTGEUnlock(
  token: string,
  owner: string,
  merkleTreeRoot: string
): Promise<TalentTGEUnlock> {
  const talentTGEUnlockContract = await ethers.getContractFactory("TalentTGEUnlock");

  const deployedTGEUnlock = await talentTGEUnlockContract.deploy(token, owner, merkleTreeRoot);
  await deployedTGEUnlock.deployed();
  return deployedTGEUnlock as TalentTGEUnlock;
}
