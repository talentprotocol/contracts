import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

const ERC20_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "allowance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientAllowance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientBalance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "approver",
        type: "address",
      },
    ],
    name: "ERC20InvalidApprover",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "ERC20InvalidReceiver",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSender",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSpender",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const MULTISEND_ABI = [
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

  const recipients = [
    "0xa6f8627247507be21bbb26ed5d33624b1bd9aa03",
    "0xd253ef26fd07adec2372c1bfe31e30519c7ba713",
    "0x111e318936660aaf49d485c74a77ffccb997d030",
    "0x1307ab404e65818318f9590ffd63ea8ff1720c8a",
    "0x64dfde617bccd7cf4e0b337d049b68cd7703fabc",
    "0x1f29cba44478bd2df384e4b21b39e6fb92f350fa",
    "0x829c0f59ff906fd617f84f6790af18f440d0c108",
    "0xb6de2f25d47f7246573ee50737f8962f2d34af76",
    "0x6d4843155412832dc3fa9c59e593cdafdf52639d",
    "0x1b35fcb58f5e1e2a42ff8e66ddf5646966abf08c",
    "0x56c82e81fc2af6623d9574b1c8f8f145773f9a69",
    "0x2654ddf31e5d8dda52fe8c1d759be186d316d8a6",
    "0x533926cca70da5ac33cc382414aaad71845bf09d",
    "0x8fd4a2cb7c8ae25965c637f39385f6e9de7d7f1e",
    "0x57b6c42113ac1f17108debbd59734c7bae6a4f43",
    "0x36de990133d36d7e3df9a820aa3ede5a2320de71",
    "0xc16e4f1237c7d7414a4ded7a4badb2899af6e91a",
    "0x4c0f3359a4ef3a4a2bbee138a34777c102e40848",
    "0xa54e778d469b49148c13ab105081bf9176184f45",
    "0xa56abdeb8b39de29fd8986e9c038165c7a7e82d6",
    "0xdb912fab7ab5fd40f17fd470573b3b999c62232c",
    "0xe20e4722f01b6e78c1a7d9d1b9de7576e4e2d11a",
    "0xb4e97e24739bae193a7ef041f110dde8e7fef754",
    "0x2d52e8f152bc792766e68273a96cd82beeaae728",
    "0x6bbe2a963525b8e9739d294efc6521872d1f3530",
    "0x4806301e3565d4e364c22732529d457bc5cf278d",
    "0x3ea45bacfc27d065c9ae7d289ed121486242d663",
    "0xef7a6bf58a7263b1df7f5bdae2f7ae7ae39bd463",
    "0x99cb34e4291e16bc625b14332d45edfb475abb60",
    "0x50bf1df7f530eb3f6bbd2479c792162f204df1e3",
    "0xb6410de8a11361bc10d75adc3b70b4cf07dbf509",
    "0x24749aedf18208ab74a8110e07e820286bb5acf8",
    "0xff3588411e280df2a2cdb256bc0108dcee551fc5",
    "0xf65fd73c481f307c8e162069e7f032e21bc1d717",
    "0xeaa823ab4c4ee00283d8ed7be713ddf8a5ba0fac",
    "0x9008e2a8c9f6e4fe77ccf98b58652176e4451ec0",
    "0xe9d83837877bdf126ae99a329f612adb4d70d982",
    "0x482e97dd296c509d2cd558c30544a567c1aaa8c3",
    "0xd15215b8d5bb0da45f7a02968513307676cd881d",
    "0xa85c3973d7078f60dec8ea69ae8b397f2aa3d836",
    "0x8e01311bd3c501e18a015f6bfd9bc0ee88fdde86",
    "0x4eb47a6916b1e9591bd87680ef8a34914e96639c",
    "0xa01522b73a1bdf131b6c7779102357edad252e62",
    "0xdc4c44943bfbc9f87d0f1fe11d69a4b814d3608c",
    "0xbdf05e45143d65139978c46ad5c3e2a7c3dd1aea",
    "0xcc475c6d51b5fe5cad3256c84af0ede800ff0767",
    "0x750fe165e895942c36f910d60ecbf772a7849d7a",
    "0x66d1f6ba1e666fc9f7a1ba2c9357c67373162d15",
    "0x54f47959117797feeb0b904ac950936dcaae73b9",
    "0x7fc45725d99313f16a6fec2b2e2d2890b01b49bb",
    "0xbf96d222f6a48c36279de83d00624245cb2274ca",
    "0xce83eba26228812fd15b5fa0471f6540233a689d",
    "0xc8d46eb7881975f9ae15216feeba2ff58e55803c",
    "0xebdd474f45eeadcaaa1fbf98fd221446e2854db4",
    "0xca4ffd1c27f05aaf62d7935560d5a5dd8b8b6d0e",
    "0x757a9d479f15ecd09f18d06b6131306da4ed2def",
    "0xecd9653829ac3908a73fb43d3a51e0f9b8c27193",
    "0xf756a96f65af4d3d3ff297113f2d6f257e332160",
    "0x34f9c0b11e67d72ad65c41ff90a6989846f28c22",
    "0x5e67d0ad959bd09b265d5baca131a86df2d6c518",
    "0x32506790d5aac3f2f948570c4ffeca127236270d",
    "0x3e21866760236ebb93cdc093d49a7c5f4c7e505c",
    "0xe3be0baae3d4928d3e2e7724d4bf188003c56ebf",
    "0x934c6a7aeb82681360661d120582077c828c185d",
    "0x05cf03eeeaa89b5f4f43faea05264322b471ec21",
    "0x663f8431cddd4e1620f20dacab6bfbe0abb0193e",
    "0x9833bd1c2e629a5d2e7d5b15ebe250e8ffa4aa96",
    "0xb1eb72fc8e2c35b63d5c4ccc863f226701de6d48",
    "0x65ac10c93ba58726d3863c5d26f9b9bca85f0245",
    "0xf29393374a20af6a64c3211b208dcaf5a966365d",
    "0xf7f262b062b2fc055f6db1a2636fce506d6558b4",
    "0x0b83bf38d7515ce65773d4e60fd52bdc55c57c21",
    "0x3172baa7ee9f32e09014f89e3e090c8d5fb15e62",
    "0xfb07d2bdef2deb1ebec001644b4732ab77281c7a",
    "0xf9fe8e7685a05a868fad19c9adf1b48546d884ac",
    "0x1f8231ef50e99d361b5252a24ec2ec44285367e1",
    "0xf92396b345fc1693824cd174718beec48119e353",
    "0x2135318d6778e7e0bf789c972c8e7be49533dd66",
    "0xcca02c00ba4a580eb3ebfa20a317cdc17caed4d5",
    "0x2f5acca3383eb9a40b9201d81d15a7a109dcc18d",
    "0xfc54c7881aaf0de34deed5bdfb5ffb99f86c9ab7",
    "0x95205e1fba8dee07dd457558c83a6d395910570c",
    "0x1e09abfaa453a663df3eba885f9e14c99bcd5156",
    "0x3e7f4c9f08c5cf5a58e58c41201342ca43550c0b",
    "0xa5f753272d7157661b36714be0ac7a64ff2f2973",
    "0xaa638a5426ad0904cc52e161b4a4832168eb9d40",
    "0x58caa30d49bb2659329448139599dd9406d4f691",
    "0xf4b245176de0108d8bd721c71a943aa1e041f058",
    "0x483b0b488cf75848cfb63a97f16064dc79f82c9c",
    "0xb75c7db0893ba890e6ac023b6a59d9634d0434af",
    "0xc6ce038a838d56cd0165237c460d6ed21acff8d1",
    "0xa12a878a844676c3ebfaf2bba0335bdeec64aace",
    "0xd541edc5ab91723a4de790507810b024ca1e9a1d",
    "0xc6e59aebb277a53f5ab5edae03199d525fd0ac89",
    "0x723d93df6881fba4a8ebeb1368132c4b210d6723",
    "0x29294763c4968e04389e27a46c0d85d1a0a89f67",
    "0x6f42929dddb6dcbb6598d182398cf135cda5ec74",
    "0x94fd5210b1e29bb26c1a9c641ecbbfc8015b82fb",
    "0x0f42f2fd58248442328237609ce7108da659a894",
    "0x2eb062916bbd0e5d74ed985b33e22810e67efc3b",
    "0x7426428c645f4fc4e0aff79be4909ca5a373800d",
    "0xe8ced5c467f880837c7fa3f2f05cb99403e6ccee",
    "0xf8761c1205caae1243359aa192d135f6e5d8b359",
    "0xa1b42f3e2884aaf55aca03c0d808accb23f7f37a",
    "0x10b9312b3226bcf1f97464c7f6a3cd4af919074b",
    "0x86fcadc4ab4ffc4943b9085119cbeabe883624c1",
    "0x5027457c50a3b45772bafe70e2e6f05d98514ad4",
    "0x6b419bea5b320f160bae2ca335431cedf5f9a340",
    "0xb4556b8b67fc10609453a27acf1b4e324c4c1cba",
    "0x5c038cb4a3bc5189670de3d01ea4bfdb58c917a5",
    "0xee672cd701402f70d095eb856caec163dc56de78",
    "0x4dd952830bdb7e59ee79ce4389b51e6ead18d757",
    "0x63f2fb7851e7e189d8c0af6d89be47074d3ed58b",
    "0x87fac7bfbde837d83e8e17755af82c5052e95cea",
    "0x5050e029fc142add49023ada888d2fc9d4a8701e",
    "0x835d037dabd24bf3429f6b1853c0d7fef62347e0",
    "0x8b89db0ba67a1cc06403945bc0819ed11841bac3",
    "0x8039a9a134ada0639891d08b45fe3440c05dbf62",
    "0xab2502b49c3a4b34abc8145841282f573ff6d663",
  ];

  const amounts = [
    "29258593880000000000",
    "29079824470000000000",
    "28955012000000000000",
    "28838500590000000000",
    "28820416120000000000",
    "28658545310000000000",
    "28362078620000000000",
    "28351998750000000000",
    "28223925140000000000",
    "28065611930000000000",
    "27928940790000000000",
    "27769145240000000000",
    "27769145240000000000",
    "27731197510000000000",
    "27635142300000000000",
    "27472678560000000000",
    "27472678560000000000",
    "27335118010000000000",
    "27282346940000000000",
    "27176211870000000000",
    "27132038330000000000",
    "27038058390000000000",
    "27038058390000000000",
    "26986769660000000000",
    "26748113970000000000",
    "26743370500000000000",
    "26741888170000000000",
    "26741888170000000000",
    "26445421480000000000",
    "26271692000000000000",
    "25912077910000000000",
    "25383477810000000000",
    "25259258270000000000",
    "24846576640000000000",
    "23777517760000000000",
    "23777221290000000000",
    "23490834470000000000",
    "23426501200000000000",
    "23422054200000000000",
    "23007297310000000000",
    "22845130030000000000",
    "22833567830000000000",
    "22599655610000000000",
    "22591947480000000000",
    "22591651010000000000",
    "22294887850000000000",
    "22294591390000000000",
    "22178969380000000000",
    "22018284430000000000",
    "21998124700000000000",
    "21998124700000000000",
    "21702547410000000000",
    "21701954480000000000",
    "21474268060000000000",
    "21405784260000000000",
    "21405487790000000000",
    "21405191320000000000",
    "21346194450000000000",
    "21345601520000000000",
    "21119100970000000000",
    "21109021100000000000",
    "21108724640000000000",
    "21058028830000000000",
    "21053878300000000000",
    "20842497550000000000",
    "20814036750000000000",
    "20812850880000000000",
    "20812257950000000000",
    "20812257950000000000",
    "20773717280000000000",
    "20527057000000000000",
    "20520238260000000000",
    "20516680660000000000",
    "20515791260000000000",
    "20458276720000000000",
    "20456201460000000000",
    "20222585710000000000",
    "20219621040000000000",
    "20219324570000000000",
    "20159734770000000000",
    "19936198890000000000",
    "19929380150000000000",
    "19923154350000000000",
    "19922857890000000000",
    "19634692260000000000",
    "19627280600000000000",
    "19626687660000000000",
    "19626391200000000000",
    "19333185640000000000",
    "19330220980000000000",
    "19093937030000000000",
    "19033754290000000000",
    "19033457820000000000",
    "19033457820000000000",
    "19033457820000000000",
    "18737880530000000000",
    "18737584070000000000",
    "18737287600000000000",
    "18441710310000000000",
    "18441413850000000000",
    "18440524450000000000",
    "18148208290000000000",
    "18144650690000000000",
    "18144354230000000000",
    "18144057760000000000",
    "18144057760000000000",
    "17847887540000000000",
    "17555571380000000000",
    "17551717320000000000",
    "17551124380000000000",
    "17551124380000000000",
    "17257029430000000000",
    "17255547100000000000",
    "17255250630000000000",
    "17254954160000000000",
    "16964713270000000000",
    "16959080410000000000",
    "16410913500000000000",
    "16368518770000000000",
  ];

  const tokenAddress = "0x9a33406165f562E16C3abD82fd1185482E01b49a";
  const multiSendContract = new ethers.Contract("0xC09488Eb32DA88A7805ccC25e58f84D65e0170D9", MULTISEND_ABI, wallet);
  
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  
  const totalAmount = amounts.reduce((acc, val) => acc.add(val), ethers.BigNumber.from(0));
  
  const currentAllowance = await tokenContract.allowance(wallet.address, multiSendContract.address);

  const approveEstimatedGas = await tokenContract.estimateGas.approve(multiSendContract.address, totalAmount);
  const approveGasLimit = Math.ceil(approveEstimatedGas.toNumber() * 1.2);
  
  if (currentAllowance.lt(totalAmount)) {
    console.log("Approving tokens...");
    const approveTx = await tokenContract.approve(multiSendContract.address, totalAmount, {
      gasLimit: approveGasLimit,
    });
    await approveTx.wait();
    console.log("Approval transaction completed");
  }

  const multiSendEstimatedGas = await multiSendContract.estimateGas.multisendToken(
    tokenAddress,
    recipients,
    amounts
  );
  const multiSendGasLimit = Math.ceil(multiSendEstimatedGas.toNumber() * 1.2);

  const tx = await multiSendContract.multisendToken(tokenAddress, recipients, amounts, {
    gasLimit: multiSendGasLimit,
  });

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
