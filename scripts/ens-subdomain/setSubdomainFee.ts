import { ethers } from "hardhat";
import TalSubdomainRegistrar from "../../artifacts/contracts/subdomain-registrar/TalSubdomainRegistrar.sol/TalSubdomainRegistrar.json";

const { exit } = process;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function main() {
  const [owner] = await ethers.getSigners();

  // Address of the deployed registrar smart contract
  // The domain needs to have an _ens record pointing to the address below
  const subdomainRegistrarAddress = "0xa25976089f3A74319660c088063Ebf8B4a55B039";

  const subdomainRegistrarContract = new ethers.Contract(subdomainRegistrarAddress, TalSubdomainRegistrar.abi, owner);

  let fee = await subdomainRegistrarContract.subdomainFee();
  console.log("fee", fee);

  // const tx = await subdomainRegistrarContract.setSubdomainFee(8);
  // tx.wait();

  // fee = await subdomainRegistrarContract.subdomainFee();
  // console.log("fee", fee);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
