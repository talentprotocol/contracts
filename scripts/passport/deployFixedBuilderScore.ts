import { ethers, network } from "hardhat";

const TALENT_VAULT_MAINNET = "0x23Ff3256A29847d7EF760943bd6679b565CbdE5a";

// Set to 60 to give everyone the bonus yield rate, or 0 for base rate only
const INITIAL_FIXED_SCORE = 60;

async function main() {
  const isMainnet = network.name === "mainnet" || network.name === "base";

  if (!isMainnet) {
    return;
  }

  const talentVaultAddress = TALENT_VAULT_MAINNET;

  console.log(`Deploying Fixed Builder Score at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin/Owner will be ${admin.address}`);

  // Deploy FixedBuilderScore
  const fixedBuilderScoreContract = await ethers.getContractFactory("FixedBuilderScore");
  const fixedBuilderScore = await fixedBuilderScoreContract.deploy(INITIAL_FIXED_SCORE, admin.address);
  await fixedBuilderScore.deployed();

  console.log(`Fixed Builder Score deployed at ${fixedBuilderScore.address}`);
  console.log(`Initial fixed score: ${INITIAL_FIXED_SCORE}`);
  console.log(`Owner: ${admin.address}`);

  // Update TalentVault to use the new FixedBuilderScore
  console.log(`\nUpdating TalentVault at ${talentVaultAddress}...`);
  const talentVault = await ethers.getContractAt("TalentVault", talentVaultAddress);
  const tx = await talentVault.setPassportBuilderScore(fixedBuilderScore.address);
  await tx.wait();

  console.log(`TalentVault.setPassportBuilderScore updated to ${fixedBuilderScore.address}`);

  console.log("\n--- Verification Command ---");
  console.log(
    `npx hardhat verify --network ${network.name} ${fixedBuilderScore.address} ${INITIAL_FIXED_SCORE} ${admin.address}`
  );

  console.log("\nDone");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
