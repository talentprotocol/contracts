import { ethers, network } from "hardhat";
const { parseUnits } = ethers.utils;

import * as TalentSponsorship from "../../artifacts/contracts/season3/TalentSponsorship.sol/TalentSponsorship.json";

import * as ERC20 from "../../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json";

async function main() {
  console.log(`Interacting with sponsorship contract ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const stableAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

  const stable = new ethers.Contract(stableAddress, ERC20.abi, admin);

  // mumbai - 0x71F92CCF86fd66FE9F1174F224CA2723D110e721
  // alfajores - 0x38B5Fb838e5A605dF510525d4A4D197Ae0DB20f0
  const contractAddress = "0x38B5Fb838e5A605dF510525d4A4D197Ae0DB20f0";

  const sponsorship = new ethers.Contract(contractAddress, TalentSponsorship.abi, admin);

  const talentAddress = admin.address;

  const amount = parseUnits("0.02");

  let tx;

  // Sponsor
  tx = await stable.connect(admin).approve(sponsorship.address, amount);
  await tx.wait();
  tx = await sponsorship.connect(admin).sponsor(talentAddress, amount, stableAddress);
  console.log(`sponsor tx: ${tx.hash}`);

  await tx.wait();

  // withdrawToken
  tx = await sponsorship.connect(admin).withdrawToken(talentAddress, stableAddress);
  console.log(`withdrawToken tx: ${tx.hash}`);

  // Revoke sponsor
  // tx = await sponsorship.connect(admin).revokeSponsor(talentAddress, amount, stableAddress);
  // console.log(`tx: ${tx.hash}`);
  // await tx.wait();

  // Alfajores 0xAaAF2e4e4252101Ed57Be5Faa64Fc87B2d79bD34
  // Mumbai 0xAaAF2e4e4252101Ed57Be5Faa64Fc87B2d79bD34

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
