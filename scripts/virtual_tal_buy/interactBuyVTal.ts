import { ethers, network } from "hardhat";
const { parseUnits } = ethers.utils;

import * as VirtualTalBuy from "../../artifacts/contracts/season3/VirtualTalBuy.sol/VirtualTalBuy.json";

import * as ERC20 from "../../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json";

async function main() {
  console.log(`Interacting with virtualTalBuy contract ${network.name}`);

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const stableAddress = "0xECd313e29b85cAf347fb832F80427602030cD3Fc";

  const stable = new ethers.Contract(stableAddress, ERC20.abi, admin);

  // mumbai - 0xb2225Bac1d53CF4F15889c3de0F741406d262Be4
  const contractAddress = "0xb2225Bac1d53CF4F15889c3de0F741406d262Be4";

  const virtualTalBuy = new ethers.Contract(contractAddress, VirtualTalBuy.abi, admin);

  const amount = parseUnits("2", 6);

  let tx;
  let allowance;

  allowance = await stable.connect(admin).allowance(admin.address, virtualTalBuy.address);
  console.log("allowance", allowance);

  // Sponsor
  tx = await stable.connect(admin).approve(virtualTalBuy.address, 0);
  await tx.wait();

  allowance = await stable.connect(admin).allowance(admin.address, virtualTalBuy.address);
  console.log("allowance", allowance);

  // console.log("Approved");
  // tx = await virtualTalBuy.connect(admin).buy(admin.address, amount);
  // console.log(`buy tx: ${tx.hash}`);

  // allowance = await stable.connect(admin).allowance(admin.address, virtualTalBuy.address);
  // console.log("allowance", allowance);

  // await tx.wait();

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
