import { ethers } from "hardhat";
import TalSubdomainRegistrar from "../../artifacts/contracts/subdomain-registrar/TalSubdomainRegistrar.sol/TalSubdomainRegistrar.json";

const { exit } = process;

async function main() {
  const [owner] = await ethers.getSigners();

  // Address of the deployed registrar smart contract
  // The domain needs to have an _ens record pointing to the address below
  const newSubdomainRegistrarAddress = "0xe86C5ea96eA47D3A9D835672C1428329bD0bb7Af";
  const oldSubdomainRegistrarAddress = "0xc187Cf217f578B7Ef6b895E08197a18E77FCd185";

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
