import { ethers } from "hardhat";
const fs = require("fs");

async function main() {
  const rawdata = fs.readFileSync("./abi.json");
  const abi = JSON.parse(rawdata);

  const provider =  new ethers.providers.JsonRpcProvider("https://forno.celo.org");
  const contract = new ethers.Contract(
    "0x8ea91a982d93836415CE3abbaf12d59fb8cE3Ff8",
    abi.abi,
    provider
  );

  const txdata = fs.readFileSync("./results.json");
  const allTX = JSON.parse(txdata);
  let  stakeEventsCount = 0;
  let rewardsClaimEventsCount = 0;

  let eventFilter = contract.filters.Stake();
  const stakeEvents = await contract.queryFilter(eventFilter);

  eventFilter = contract.filters.RewardsClaim();
  const rewardsClaimEvents = await contract.queryFilter(eventFilter);
  console.log(rewardsClaimEvents.length)
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
