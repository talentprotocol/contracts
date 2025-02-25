import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

const ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "total",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "Multisended",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "address[]",
        "name": "_recipients",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "_amounts",
        "type": "uint256[]"
      }
    ],
    "name": "multisendToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ARRAY_LIMIT",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in .env file");
  }

  const provider = ethers.provider;
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`Using signer address: ${wallet.address}`);
  
  const balance = await wallet.getBalance();
  console.log(`Signer balance: ${ethers.utils.formatEther(balance)} ETH`);

  const multiSendContract = new ethers.Contract("0x3d84A0f00ecB745be47914226A6D80Ab10e80F04", ABI, wallet);

  const recipients = [
    "0xb9e330591644f7def5c79ca3c151b1dc0e0ce502",
    "0x88ac3d64230c8a453492ff908a02daa27e9b3429",
    "0x4a27bfd91b30efaf08706d2105e5d8a1ad09ff0c",
    "0x65e68b160c09fef61e72eeb8d6e43544cb68770c",
  ];

  const amounts = [
    "35494267270000000000",
    "30284791840000000000",
    "32466057570000000000",
    "180938032030000000000"
  ];

  const tokenAddress = "0xDF3bA85065153AbDc4CA1D9B3Dd2954aAbF5BE42";

  const tx = await multiSendContract.multisendToken(
    tokenAddress,
    recipients,
    amounts
  );

  console.log("Transaction:", tx.hash);
  await tx.wait();
  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
