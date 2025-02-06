import { ethers } from "hardhat";
import type {
  PassportRegistry,
  TalentProtocolToken,
  TalentRewardClaim,
  PassportBuilderScore,
  TalentCommunitySale,
  TalentTGEUnlock,
  TalentBuilderScore,
  PassportWalletRegistry,
  TalentTGEUnlockTimestamp,
  TalentVault,
} from "../../typechain-types";

export async function deployPassport(owner: string): Promise<PassportRegistry> {
  const passportRegistryContract = await ethers.getContractFactory("PassportRegistry");

  const deployedPassport = await passportRegistryContract.deploy(owner);
  await deployedPassport.deployed();

  return deployedPassport as PassportRegistry;
}

export async function deployPassportWalletRegistry(
  owner: string,
  passportRegistry: string
): Promise<PassportWalletRegistry> {
  const passportWalletRegistryContract = await ethers.getContractFactory("PassportWalletRegistry");

  const deployedPassportWalletRegistry = await passportWalletRegistryContract.deploy(owner, passportRegistry);
  await deployedPassportWalletRegistry.deployed();

  return deployedPassportWalletRegistry as PassportWalletRegistry;
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
  passportWalletRegistry: string,
  holdingWallet: string,
  owner: string,
  merkleRoot: string
): Promise<TalentRewardClaim> {
  const talentRewardClaimContract = await ethers.getContractFactory("TalentRewardClaim");

  const deployedRewardClaim = await talentRewardClaimContract.deploy(
    token,
    scoreContract,
    passportWalletRegistry,
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

export async function deployTalentBuilderScore(
  owner: string,
  passportBuilderScore: string,
  passportRegistry: string,
  feeReceiver: string,
): Promise<TalentBuilderScore> {
  const talentBuilderScoreContract = await ethers.getContractFactory("TalentBuilderScore");

  const deployedTalentBuilderScore = await talentBuilderScoreContract.deploy(
    owner,
    passportBuilderScore,
    passportRegistry,
    feeReceiver
  );
  await deployedTalentBuilderScore.deployed();

  return deployedTalentBuilderScore as TalentBuilderScore;
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
  merkleTreeRoot: string,
  passportBuilderScore: string,
  minimumClaimBuilderScore: number
): Promise<TalentTGEUnlock> {
  const talentTGEUnlockContract = await ethers.getContractFactory("TalentTGEUnlock");

  const deployedTGEUnlock = await talentTGEUnlockContract.deploy(
    token,
    merkleTreeRoot,
    passportBuilderScore,
    minimumClaimBuilderScore,
    owner
  );
  await deployedTGEUnlock.deployed();
  return deployedTGEUnlock as TalentTGEUnlock;
}

export async function deployTalentTGEUnlockTimestamps(
  token: string,
  owner: string,
  merkleTreeRoot: string,
  timestamp: number
): Promise<TalentTGEUnlockTimestamp> {
  const talentTGEUnlockWithTimestampsContract = await ethers.getContractFactory("TalentTGEUnlockTimestamp");

  const deployedTGEUnlock = await talentTGEUnlockWithTimestampsContract.deploy(token, merkleTreeRoot, owner, timestamp);
  await deployedTGEUnlock.deployed();
  return deployedTGEUnlock as TalentTGEUnlockTimestamp;
}

export async function deployTalentVault(
  talentToken: string,
  yieldSource: string,
  passportBuilderScore: string,
  passportWalletRegistry: string
): Promise<TalentVault> {
  const talentVaultContract = await ethers.getContractFactory("TalentVault");

  const deployedTalentVault = await talentVaultContract.deploy(
    talentToken,
    yieldSource,
    passportBuilderScore,
    passportWalletRegistry
  );

  await deployedTalentVault.deployed();

  return deployedTalentVault as TalentVault;
}
