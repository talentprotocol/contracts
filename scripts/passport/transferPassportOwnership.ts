import hre from "hardhat";

import { getContract } from "viem";
import { baseSepolia, base } from "viem/chains";
import { privateKeyToSimpleSmartAccount } from "permissionless/accounts";

import * as PassportRegistry from "../../artifacts/contracts/passport/PassportRegistry.sol/PassportRegistry.json";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

async function main() {
  const [admin] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const chain = baseSepolia;

  console.log(`Changing owner on chain ${chain.name}`);

  // https://api.developer.coinbase.com/rpc/v1/base/w6ubd9S5jJzUzPlMn0yYmuP9UWbjKvrH
  const rpcUrl = "https://api.developer.coinbase.com/rpc/v1/base-sepolia/Ip9cOQPtBOm81rN2I9_1rBiMXOfKBxii";
  const contractAddress = "0x0fDD539a38B5ee3f077238e20d65177F3A5688Df";
  const privateKey = "0x";

  console.log("privateKey", privateKey);
  const smartAccount = await privateKeyToSimpleSmartAccount(publicClient, {
    privateKey,
    entryPoint: ENTRYPOINT, // global entrypoint
    factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454",
  });

  console.log(`Owner SCA ${smartAccount.address}`);

  const passportRegistry = getContract({
    address: contractAddress,
    abi: PassportRegistry.abi,
    client: {
      public: publicClient,
      wallet: admin,
    },
  });

  const tx = await passportRegistry.write.transferOwnership([smartAccount.address]);

  await publicClient.waitForTransactionReceipt({ hash: tx });

  const owner = await passportRegistry.read.passportId([admin.account.address]);

  console.log(`New owner: ${owner}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
