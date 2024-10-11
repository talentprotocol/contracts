import { ethers, network } from "hardhat";
import { PassportBuilderScore } from "../../test/shared/artifacts";

async function main() {
  const [admin] = await ethers.getSigners();

  const builderScore = new ethers.Contract(
    "0x271b024Ab760407529ad8ba701A1069c039275F0",
    PassportBuilderScore.abi,
    admin
  );

  // replace with address to be a trusted signer
  const tx = await builderScore.addTrustedSigner("");

  console.log("tx", tx);
  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
