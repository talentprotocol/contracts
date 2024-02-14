import { ethers, upgrades } from "hardhat";

const { exit } = process;

const { parseUnits } = ethers.utils;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log(owner.address);

  enum MintReason {
    TalentRedeemableRewards,
    TalentRewards,
    SupporterRewards,
    TalentTokensSold,
    InAppRewards,
    Investor,
  }

  const polygonTxs = [
    "0x9f0d5f5460f84cd1adee33b20f41f3f3b6461b14866f62b9507b6b7738066c40",
    "0x9a8b890a07f437b80c446e3fc161d734eee72616cb64ea4c092cbb46cbe4a186",
    "0x3d5eeaf4d0db6475d66bbae2206fecfcccef6cb77d77b853b7ed5c1a23ab5aed",
    "0xecc557e6470d63e3f06e316c7bca4ad96a0b03f64d29b6178d350ec212de6516",
    "0xaf11e4ede45cc37707cb5f87a767644fd702a612b9df6e92253b9819cdf8760d",
    "0xf28444e3465f88fc616c9243f0af18ce36004fde8f0f7785ee06073bcd912a4d",
    "0xd1cb9024f4ec5fa4d8fcb14485609f5687f4c399b3ccc0e2819324d648588e95",
    "0x600b43ec43adc69179b3028d9f6f437461b6c435bde0000d1410b5faf2bcb4dd",
    "0x27bda26ed7932177afd928addefacaa2ba635034b10cc2436edd2ae115fb27bd",
    "0xfce85b4bab23c01204a2cd9e632c708b31afe2a4d9e740f3ff79832555cbf6be",
    "0xf6a880bdf53a87797c6ad1b704d05e7a71d7957c6ef98417591cac9234004c43",
    "0x87941c7603d7efdf7e539a9b74ecfdb4e931615f8d70bf07dd0c42a512e09474",
    "0x8835e4a62c4fa43a50753671815b55c4eb2f47d215e29f36823d4dafbb4d11d6",
    "0x0c68be44fb8c1654ae52d516c5faf35c2c21166004980f3e081b7289ebeda577",
    "0x1dc183e4a8c45ce3d6f857bb51663160fdafe98366822b53a09c8b3699e44238",
    "0x98f5582569017eb7f70b0ec8f39613f3d9308df7c2fa6556077b3715e0b5ad55",
    "0x3442734d232b765adf1cf2744b87b539ec36ca3833e02a7d65d0f2d33c4fff77",
    "0xf572d476f39567c104cc77cf4e854c3ad651aa3c0909ad504bcade37b5335b5a",
    "0x824cbb82cd86bec2c9d89cbbcf52f57282e7e86dc693cf1790ae623fff66fb3c",
    "0x793f7dd8cd1e34ee42ef6621f3e1a01e25b1a97eee92af33fc571e2567b578b8",
    "0x8ecd1ddff55fb8c86da639ecf29b8df080153c546137ed67962cfe98c61caa8e",
    "0x7173d5fc0005bc7de4fc9fc35839f9c0bcde93f955a2d3933db9674792f3f561",
    "0x3677a00b14daa6ab03fe42bb594e9918e3600f9bb7993097494ed4492d3b5338",
    "0xf0782f08aa1233829799ee656c61668db2c0764c32e976721ba75866db3d4f11",
    "0xf474dce064d0c94c17a574cc697227c85fb274c59d9c89d5c37dcc254b20cec6",
    "0x3002120814085b974ada4d3f178b720f051b931f7934872da697e91ba4cc8156",
    "0x533fe35f5900b7978965f39073398c3216542c314a3bbfce91e1175e43278b3d",
    "0x504ba38ad3c683cc74da6732122343a926333a7c6e17b3a01ff27671f89642a8",
    "0x71576d8ab9bb5abc7f599fb106fc3eee7d6eb111cc48b995c1a37b61592335a2",
    "0x5a9f07f46ef767ec0206821d5ea89dabaeed9f0127d7e5b7a54cdce5d51d20a3",
    "0x2580612fa9ef193e0ebd52e7b8d41aef87c3a6d22cd9670a0a17a4242ea0e502",
    "0x23089cd76ac8ccb47d3a535415560c7e3fe5f7889581225e1a7f9bdcf4064aec",
    "0xd315187373c35a008cd4de030d44f47262c87a5e57101bdc71273c4b18964020",
    "0xd91a94443054ac732668f7f1c42fd775fed6aaf434fc5e6505569f4e9c953928",
    "0xcd5494a89dac0f3e1f18af51097c7c5a88b0b5bdfb2f4924b70b1442ea853457",
    "0x6ec020228e6fbadbeef02c4de46f40809ec548ee2ee8b203cde88d5d37fdbbeb",
    "0xd5d6938550a652681a043e9b3a0cd3765d4c1449dba31be4c7658490fa39839b",
    "0xc66f9ee60e7fa790f650ca6661d421a47f1537fa49028232968e78417814e4ec",
    "0x471851c815d2412c84b88b3bcc78adc88ab11282b1e1a93a01546d2e28485df2",
    "0x470db5492708a8d56623249783a41680db968401df04123c425d7b9fb90e48c9",
    "0x13fc62adb748a9fd96bccb4a13ba578d6b1e4b86f061a8c377c553b5d2beb558",
    "0x1034adffd4129fb7e559bad1308917df0b24eecbac7fe0d0609a77b5c45c8b4e",
    "0x9f87bbf1b03eba0ffa9e5f27a5d02a7a89e462e03be43ff3c8c1e3c087b80199",
    "0x50e9ba3b7e71c2f2a9de96967765795ae5ceaaf2f0e1c15847b5dce3a63c8c20",
    "0x4d542975edce988645412fbbbabb0f92766754f8ec2e6023003f8464ee742469",
    "0x1dc4eaa802c1b6a92a5af20c59bac6a0f4be6132b0bf02bac3eaabc186a233c2",
    "0xd1baf7b06b752bc99b1179b34390db7b620cbaf1e552c2c5973834e3237c49f4",
    "0xb81cdfa4b150cb92190a1427b0158e854c70a809247b2cc3c0147a495b44650e",
    "0xb638cd6153c344d2b0b06ae3a8fd0445baa8d0d150eb9b28249b74c6cc164219",
    "0xe81fa5f1211e8fc56f80f5a50a7b8ac8db2a20f7248d6b823729a663426a337a",
    "0x5ba041c15a388fbd7c860ff45d206b5d8ba58a491c2e61448e620a4c35379ef7",
    "0x67f2f8841585e4cf9357dc8d6f65fd6d513079675c8ba4e08f8ac1f3e61f246e",
    "0x7743ac831ceb3e9c211c89658319a16a41be10576a887c5e9ece66d6756ea186",
    "0xd67ca04d89e40a576509f061b90fca3fa9839b9c1e86ed8cfffc581cd8307516",
    "0x0222fd9bfb652592fe3a2d8e85f271899bd0ad3097ffdb85018a4a87162a71f0",
    "0x53a813c2af6651b096c8c5d5c95524f61580a34c15a0c59f60d56ddc8928cd36",
    "0xd132b9b55c3e76ade567bbde002ca666ce91f5a278b03dcedbffc23899795991",
    "0x55874e2509cdea0a37d8724536f229d127d1bbe6eb9c31171d565c247b6eaba5",
    "0x26b3dde45c262bff12713a1b7b9454005d4345a80905fd4271594af3d54acb81",
    "0x507774602edb133d6fa7128def9145ec76cf230e1ba2da2fd5888c3a1bfec621",
    "0x4460d757696db95afb716f8c29c750d47d4a12bba72e65594ab2e660642e1dd7",
    "0x4777f226190839b5fb1b4534c87c36e7ec7dbcc2874637a54e2e66e6194076c8",
    "0x511e10d6001b4c40d6642ec8513ab1aea2fcd401cdbc469731a74078a5b0e278",
    "0xabc809212ca83d7a012be674b8cf665d72b33bc530a299c32fab25de770cc9fd",
    "0x9088ce17a03c50f095086ab426290234467e08dda99280a8e4209fa845e32f1e",
    "0x96dfa48c0ec7a4f0bf9d738488f41271d9ab7bcbea8d68e9f33429ef213353f7",
    "0x79a2c3ad4c56d91867d126cfb6a7dc74062113353788156c32ae0b030de679a2",
    "0xa25b02c6199414885b09fe491b43644825d153ded6b967e20546195d9a6c88df",
    "0x96e70f8ba14c1a97881ab09ace8704c37d2165ae34d556577173fd664111a7f9",
    "0x2f17e505b076777b8e18733d151a6a8f30d626a9218f1ae930e85826d82d6027",
    "0x75ebc05cebda8263686ee6d3e372a89adeddfe2006703f5141ce19b379d7bf71",
    "0x77237b9b35132e1e4975eb000ed26899ce63b4eceb987a110618efdf8ed86da4",
    "0xc07e96f4f9c35f95a39297945d2011c1ad61b757d5f0a9509dbab920b4d3cc0a",
  ];

  // celo https://forno.celo.org
  const provider = new ethers.providers.JsonRpcProvider(
    "https://polygon-mainnet.infura.io/v3/52812ca3d9f74d13ad593b67a3aa8312"
  );

  const celoTxs = [
    "0x249c87ec42165c9da51760e93a048cabbdf361049b57a5d7394cc6bea4f16126",
    "0x9bb486938a056a63ae235e3485b6974226f4ed5de824687f3e8646fd093e4025",
    "0x909f6fcf1aa144008ecb328da8f4e8a6249123173a5cf07a4eea01273f3e80d2",
  ];

  // celo 0xD57f6f45dfbB14d0Af64e0B236e1734924A933eb
  const virtualTALAddr = "0x094dde6b94c04af7ff67d62d631b4071cb8618a4";

  const virtualTAL = await ethers.getContractAt("VirtualTAL", virtualTALAddr);

  for await (const tx of polygonTxs) {
    console.log("###### NEW TX ######");
    console.log("Running TX: ", tx);
    const transaction = await provider.getTransactionReceipt(tx);

    const logs = transaction.logs.map((log: any) => {
      try {
        return virtualTAL.interface.parseLog(log);
      } catch {
        return null;
      }
    });

    const burnLogs = logs.filter((item) => !!item && item.name === "AdminBurned");

    const burnEvent = burnLogs[0];

    const amount = burnEvent?.args.amount;
    const to = burnEvent?.args.owner;

    console.log("ADDRESS: ", to);
    console.log("AMOUNT: ", amount);

    const balance = await virtualTAL.getBalance(to);

    console.log("BALANCE", balance);

    const newTx = await virtualTAL.adminMint(to, amount, MintReason.InAppRewards);

    await newTx.wait();

    console.log("TX", newTx.hash);

    const newBalance = await virtualTAL.getBalance(to);

    console.log("BALANCE", newBalance);
  }
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
