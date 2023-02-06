import { ethers } from "hardhat";
import TalSubdomainRegistrar from "../../artifacts/contracts/subdomain-registrar/TalSubdomainRegistrar.sol/TalSubdomainRegistrar.json";

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  // Address of the deployed registrar smart contract
  // The domain needs to have an _ens record pointing to the address below
  const newSubdomainRegistrarAddress = "0x38B5Fb838e5A605dF510525d4A4D197Ae0DB20f0";
  const oldSubdomainRegistrarAddress = "0x1e6c790d7651338F3CB88381a0861bD21Df28a49";

  const subdomainRegistrarContract = new ethers.Contract(
    oldSubdomainRegistrarAddress,
    TalSubdomainRegistrar.abi,
    owner
  );

  let address = await subdomainRegistrarContract.owner();
  console.log("subdomainRegistrarContract.owner()", address);

  await subdomainRegistrarContract.transferDomainOwnership(newSubdomainRegistrarAddress);

  address = await subdomainRegistrarContract.owner();
  console.log("subdomainRegistrarContract.owner()", address);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
