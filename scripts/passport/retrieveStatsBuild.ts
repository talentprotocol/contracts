import { ethers, network } from "hardhat";
import Round1 from "./Round1.json";

const Round1ContractAddress = "0x556e182ad2b72f5934C2215d6A56cFC19936FdB7";

const retrieveContractData = async (contractAddress: string, cursor: string | undefined) => {
  const url = `https://base-mainnet.g.alchemy.com/v2/lv7e4-pbX7RAVRnLhKqSssKUPeiD2TOP`;

  const params = {
    fromBlock: "0x0",
    toBlock: "latest",
    toAddress: contractAddress,
    maxCount: "0x001",
    order: "asc",
    withMetadata: true,
    excludeZeroValue: true,
    category: ["external", "erc20", "erc721", "erc1155", "specialnft"],
    pageKey: cursor || undefined,
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params,
      id: 1,
    }),
  });

  return response;
};

async function main() {
  const [admin] = await ethers.getSigners();
  const provider = new ethers.providers.JsonRpcProvider(
    "https://api.developer.coinbase.com/rpc/v1/base/w6ubd9S5jJzUzPlMn0yYmuP9UWbjKvrH"
  );

  console.log(`Wallet in use - ${admin.address}`);

  const round1Interface = new ethers.utils.Interface(Round1);
  let round1Data = [];
  let page = undefined;
  do {
    const data = await retrieveContractData(Round1ContractAddress, page);
    const json = await data.json();
    const { transfers } = json.result;
    page = json.result.pageKey;
    // console.log(json);

    for (const transfer of transfers) {
      // console.log(transfer);
      const receipt = await provider.getTransactionReceipt(transfer.hash);
      console.log(transfer.hash);
      round1Data.push(transfer.hash);
      // console.log(receipt);
      for (const log of receipt.logs) {
        if (log.address !== Round1ContractAddress) {
          continue;
        }
        const parsedLog = round1Interface.parseLog(log);
        // console.log(parsedLog);
        if (parsedLog.name === "Donated") {
          console.log("Donation");
        } else if (parsedLog.name === "Claimed") {
          console.log("Claimed");
        }
      }
    }
  } while (round1Data.length > 0);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
