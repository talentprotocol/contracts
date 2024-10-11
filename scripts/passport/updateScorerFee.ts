import { ethers, network } from "hardhat";
import { SmartBuilderScore } from "../../test/shared/artifacts";

async function main() {
  const [admin] = await ethers.getSigners();

  const smartBuilderScore = new ethers.Contract(
    "0x560431E2587B547E2a28aA5f3Ba1FD04842f73c3",
    SmartBuilderScore.abi,
    admin
  );

  const tx = await smartBuilderScore.setCost(ethers.utils.parseEther("0.0001"));

  console.log("tx", tx);
  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
