import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { deployTalentToken } from "../shared";

// @TODO: add all safes and addresses that need to receive the tokens
const talentTokenSetup = [
  {
    name: "SAFE Talent Token",
    address: "0x0",
    amount: "1000000000"
  }
]

async function main() {
  console.log(`Deploying Talent Token at ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  console.log('validating setup');

  for (let i = 0; i < talentTokenSetup.length; i++) {
    const setup = talentTokenSetup[i];
    if (setup.address === "0x0") {
      throw new Error(`Invalid address for ${setup.name}`);
    }
  }

  const totalAmount = talentTokenSetup.reduce((acc, setup) => acc.add(ethers.utils.parseEther(setup.amount)), BigNumber.from(0));
  if (!totalAmount.eq(ethers.utils.parseEther("1000000000"))) {
    throw new Error(`Total amount does not match the full supply`);
  }

  const talentToken = await deployTalentToken();

  console.log(`Talent Token Address: ${talentToken.address}`);
  console.log(`Talent Token owner: ${await talentToken.owner()}`);

  for (let i = 0; i < talentTokenSetup.length; i++) {
    const setup = talentTokenSetup[i];
    await talentToken.connect(admin).transfer(setup.address, ethers.utils.parseEther(setup.amount));
    console.log(`transfered ${setup.amount} tokens to ${setup.address}`);
  }

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
