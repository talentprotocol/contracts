import { ethers } from "hardhat";
import TalSubdomainRegistrar from "../../artifacts/contracts/subdomain-registrar/TalSubdomainRegistrar.sol/TalSubdomainRegistrar.json";

const { exit } = process;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function main() {
  const [owner] = await ethers.getSigners();

  // Address of the deployed registrar smart contract
  // The domain needs to have an _ens record pointing to the address below
  const subdomainRegistrarAddress = "0xe86C5ea96eA47D3A9D835672C1428329bD0bb7Af";

  const subdomainRegistrarContract = new ethers.Contract(subdomainRegistrarAddress, TalSubdomainRegistrar.abi, owner);

  const fee = await subdomainRegistrarContract.subdomainFee();
  console.log("fee", fee);

  const contractOwner = await subdomainRegistrarContract.owner();
  console.log("contractOwner", contractOwner);

  const subdomain = "rubendinis";
  const subdomainNewOwner = "0xc8b74c37bd25e6ca8cb6ddf2e01058c45d341182";

  const ownerAddress = await subdomainRegistrarContract.subDomainOwner(subdomain);
  console.log(`${subdomain} subdomainOwnerAddress`, ownerAddress);

  if (ZERO_ADDRESS == ownerAddress) {
    console.log(`${subdomain} Subdomain is free to be taken.`);
  }

  const tx = await subdomainRegistrarContract.freeRegister(subdomain, subdomainNewOwner);
  console.log(`register tx`, tx);

  const newOwnerAddress = await subdomainRegistrarContract.subDomainOwner(subdomain);
  console.log(`${subdomain} newSubdomainOwnerAddress`, newOwnerAddress);

  // let tx = await subdomainRegistrarContract.configureDomain(subdomain, '10000000000000000');
  // console.log(tx);
  // tx = await subdomainRegistrarContract.query(sha3(subdomain), '');

  // console.log(tx);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
