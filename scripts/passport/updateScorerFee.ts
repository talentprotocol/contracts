import { ethers, network } from "hardhat";
import { SmartBuilderScore } from "../../test/shared/artifacts";

async function main() {
  const [admin] = await ethers.getSigners();

  const smartBuilderScore = new ethers.Contract(
    "0xE23104E89fF4c93A677136C4cBdFD2037B35BE67",
    SmartBuilderScore.abi,
    admin
  );

  const tx = await smartBuilderScore.setCost(ethers.utils.parseEther("0.001"));

  console.log("tx", tx);
  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
