import hre from "hardhat";

import { http, getContract } from "viem";

import { createSmartAccountClient, ENTRYPOINT_ADDRESS_V06 } from "permissionless";
import { baseSepolia, base } from "viem/chains";
import { privateKeyToSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoPaymasterClient } from "permissionless/clients/pimlico";

import * as PassportRegistry from "../../artifacts/contracts/passport/PassportRegistry.sol/PassportRegistry.json";

async function main() {
  const [admin] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const chain = baseSepolia;

  console.log(`Changing owner on chain ${chain.name}`);

  // https://api.developer.coinbase.com/rpc/v1/base/w6ubd9S5jJzUzPlMn0yYmuP9UWbjKvrH
  const rpcUrl = "https://api.developer.coinbase.com/rpc/v1/base-sepolia/w6ubd9S5jJzUzPlMn0yYmuP9UWbjKvrH";
  const contractAddress = "0x0fDD539a38B5ee3f077238e20d65177F3A5688Df";
  const privateKey = "0x";
  const entryPoint = ENTRYPOINT_ADDRESS_V06;

  console.log("privateKey", privateKey);
  const smartAccount = await privateKeyToSimpleSmartAccount(publicClient, {
    privateKey,
    entryPoint, // global entrypoint
    factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454",
  });

  console.log(`Owner SCA ${smartAccount.address}`);

  const paymasterClient = createPimlicoPaymasterClient({
    transport: http(rpcUrl),
    entryPoint,
    chain,
  });

  console.log("paymasterClient");

  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    entryPoint,
    chain,
    bundlerTransport: http(rpcUrl),
    // IMPORTANT: Set up the Cloud Paymaster to sponsor your transaction
    middleware: {
      sponsorUserOperation: paymasterClient.sponsorUserOperation,
    },
  });

  const passportRegistry = getContract({
    address: contractAddress,
    abi: PassportRegistry.abi,
    client: {
      public: publicClient,
      wallet: smartAccountClient,
    },
  });

  const owner = await passportRegistry.read.owner();

  console.log(`Registry owner: ${owner}`);

  const sequencial = await passportRegistry.read.sequencial();

  console.log(`Registry sequencial: ${sequencial}`);

  const nextId = await passportRegistry.read.nextId();

  console.log(`Registry nextId: ${nextId}`);

  // const txHash = await passportRegistry.write.setGenerationMode([false, 0]);

  const txHash = await passportRegistry.write.adminCreate([
    "fasrcaster",
    "0x436cA2299e7fDF36C4b1164cA3e80081E68c318A",
    2,
  ]);

  console.log(`UserOperation included: https://sepolia.basescan.org/tx/${txHash}`);

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const passportId = await passportRegistry.read.passportId([admin.account.address]);

  console.log(`New passportId: ${passportId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
