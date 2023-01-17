import { ethers } from "hardhat";
import TalSubdomainRegistrar from "../../artifacts/contracts/subdomain-registrar/TalSubdomainRegistrar.sol/TalSubdomainRegistrar.json";

const { exit } = process;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function main() {
  const [owner] = await ethers.getSigners();
  const provider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth_goerli") as any;
  const feeData = await provider.getFeeData();

  // Address of the deployed registrar smart contract
  // The domain needs to have an _ens record pointing to the address below
  const subdomainRegistrarAddress = "0x7F522d7d45434655b616F7CB8AD0304623e7Eb38";

  const subdomainRegistrarContract = new ethers.Contract(
    subdomainRegistrarAddress,
    TalSubdomainRegistrar.abi,
    owner
  );

  const fee = await subdomainRegistrarContract.subdomainFee();
  console.log("fee", fee);

  const contractOwner = await subdomainRegistrarContract.owner();
  console.log("contractOwner", contractOwner);

  const subdomain = "dinis";

  const ownerAddress = await subdomainRegistrarContract.subDomainOwner(subdomain);
  console.log(`${subdomain} subdomainOwnerAddress`, ownerAddress)

  if(ZERO_ADDRESS == ownerAddress) {
    console.log(`${subdomain} Subdomain is free to be taken.`)
  }
  
  const tx = await subdomainRegistrarContract.register(subdomain);
  console.log(`register tx`, tx)

  const newOwnerAddress = await subdomainRegistrarContract.subDomainOwner(subdomain);
  console.log(`${subdomain} newSubdomainOwnerAddress`, newOwnerAddress)

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
