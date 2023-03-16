import { ethers, upgrades, waffle } from "hardhat";

import * as TalentTokenArtifactV2 from "../../artifacts/contracts/test/TalentTokenV2.sol/TalentTokenV2.json";
import * as TalentTokenMigration from "../../artifacts/contracts/season3/TalentTokenMigration.sol/TalentTokenMigration.json";
import { UpgradeableBeacon__factory } from "../../typechain-types";

const { exit } = process;
const { deployContract } = waffle;

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner: ", owner.address);

  const factory = await ethers.getContractAt("TalentFactoryV3", "0xBBFeDA7c4d8d9Df752542b03CdD715F790B32D0B");

  // console.log("factory address:", factory.address);

  // const beaconAddr = await factory.implementationBeacon();

  // console.log("beacon address: ", beaconAddr);

  // const talentTokenMigration = await deployContract(owner, TalentTokenMigration, []);

  // console.log("New talent token contract: ", talentTokenMigration.address);
  // console.log("Connecting to beacon");
  // const beacon = UpgradeableBeacon__factory.connect(beaconAddr, owner);

  // console.log("Upgrading");
  // await beacon.upgradeTo("0x164F1D6a482c660Cf3FD35A470ecd1AB7A530012");

  // console.log("Upgrade done");

  // const token = await ethers.getContractAt("TalentTokenMigration", "0x620353c9bfda195668fa0d3b7f5a526f2e169416");

  // const talent = await token.talent();
  // console.log("talent", talent);

  // const mintingAvailability = await token.mintingAvailability();
  // console.log("mintingAvailability", mintingAvailability);

  // const totalSupply = await token.totalSupply();
  // console.log("totalSupply", totalSupply);

  const allTokens: any = [
    "0x0f8c23aeae644a0346833f2d5c37e3df9219f8c4",
    "0xa95844a74427957d288ebfb5aabdb716003204f9",
    "0x36d971071cdb8e97d226323ae31cfbb5b07ca1d5",
    "0x7e455efe84aa268201530e053a31cfd838bf943a",
    "0x0d50eb352f83325e1d961ee69924741f6a60bc16",
    "0x2f8ce220db94360fd1e6ba50985dfdf66163900c",
    "0xd9ea68cee526d38a01df8d6044dccacb6bd82a4a",
    "0x2728971e9ee1e12b87404dbcce2c98cb8d0e9357",
    "0xc9f99282e0cea219b30b900d061b9c97fb0cfe89",
    "0x9f3ca4be94ce4ec54ead0c08324babfc71b9d4f9",
    "0xe91841e71c5b35517a5f84dbab1d52093b8c2ee0",
    "0xb1fc683820b7af922aa6fbd43987aab392baa7ef",
    "0xc379d5731abbda3542fc66d59e32acbcba4f10f9",
    "0x3bd0fa7baae6baf9e15876d3a5ae4b7b632f9c5e",
    "0x58240370dd7a2c6557b68c43484501c3605e244f",
    "0x1923b06dd6548f111adc027740c532605e07672c",
    "0xc09003ae00855313af0ebb9f4129e72f5e48f598",
    "0xd1748912dcd381efa5c8694af46cbc67ebef0b03",
    "0x1e06c2b148e35b26a9a9c46ced53e7b8b1841b76",
    "0xe2053d7105f84328f76aa37bbfb56f7120381b0a",
    "0x8e676ea3df05461a41713e46c711f5b6dddd1580",
    "0xdde92cc10634797e06ffa45f9a4d7336e6612ed4",
    "0x91a87eb8fef959f42766c84e1a398189ee5b47bd",
    "0xe4b34e6ddb3f9392b120d5331fd3628eff14861c",
    "0xa7195bafbae5837caba32f10ae3351ba55573a88",
    "0xef63201f2f927254d500c9f98156f3a75f20bb9d",
    "0x1880a77c47498cc6358e20705e77745d5bdeac70",
    "0x39ca33344d16ecdbb1d2ceeb301328ffa6a2d3fa",
    "0x72dc5b0e7b6b3a4cb5508c27f564619b8a2d1211",
    "0x38b564658e14a73ae2f9f9db42934e52bf155054",
    "0x39ba655d95cbe7e57dc7bb37e4da5071e66b2def",
    "0xdbcff31cd433aa903adc7f310389cc8b5c1583e4",
    "0xe670cde16395fc6953f10dee6f5b4bc777fc5117",
    "0x09d1c9f6e3ae692bc3ad00d8627c13af7880da08",
    "0xf2362b3939818e1d06031334d876550a41a13113",
    "0x86452bc7c28135997ff814ded9191e7734ef0f3a",
    "0x5baf409255b6026ef9a74daebcfa2f34e43de3c9",
    "0x4f7371afe5e76d1056e4e4654b5a553d97aae7d6",
    "0xae1872ecf44ef648db5f3f0d6ed5c65a2b225cb3",
    "0x81b752f4854a550000195ad0c173bb03b3ca0dd9",
    "0xbd5ff65857d7c91ff097e608f16fd02f264ca6d1",
    "0x257333acea4f57c851d40090e0af4d150315a004",
    "0x5f992161351a6d0aae44c251adf04edccb580b4a",
    "0x6b24765956521bb9828471580d083a167185a104",
    "0xc7cc31bba3ff09a0b4034754d4bd418b64ac7ecf",
    "0x989f1f1fcff47e064570efee5dd57973c6ffec8a",
    "0x060e610ac888d5fa35b5650318ff9395613e3d02",
    "0x9cfbe56019522081bd5970493086de7a415ba387",
    "0xacec4390d82a8540d65a3ae90fec825139e0995b",
    "0xff23f81b5ef09020dfd1f8993613b2939676853f",
    "0x7f5c71ceabe1131629797d61621d232b826bb298",
    "0x03309d11e941a8f236ef5c74ac5545397a9f0237",
    "0xf6f3a190a80f49fb68b6666705da1325d0cabdde",
    "0x1c268e631f8b1f8556c6feebb7ed96b640b907f9",
    "0xb4f035bcaf81aeb5e05181d7b651ed848a20dd27",
    "0x6bfc136560b28ef67663eefe8d33e3ae11d86e94",
    "0xf83ac95d3844b4f6d1464fc121363cb3207aea56",
    "0x87103b8e29bf6159666a19a19d9d9218d3b1d003",
    "0x69099652a5ead43450d9566346e7767074bd4dd6",
    "0x54fe591c80188100c7a6eaf13d5519cec8eb0dad",
    "0x8a7c56a378eab2fc2247a84ac3beef41b10ed425",
    "0x2eabf6e9339f2ab182deb1c96c66e1f34bc8c18b",
    "0x13466a7c176b11e21a95d27d817acd2458a1f9b6",
    "0x7709df977164af0d6d490fb3432d567e803d0b55",
    "0xb89005340a98be80b57bb79e14591e083b090d9c",
    "0x3efd9a07f404b18e43e87616bd4bff4729f4868b",
    "0xecebb88e107484776a315de1aa8b3cda28738b46",
    "0x1577743accb98629a0a9292cf7303d7acbf3a34e",
    "0x252e0e45c6d6d96cac7b70758fab0f297c0dcc29",
    "0xb970da5c2066fb92eaa97b59ce8161525d1cd97b",
    "0x4cda9183569dd157cbf9edafa84fad3b473d3acf",
    "0x883f3b009dce9cbbb38d0ae793065508e921dd1e",
    "0x3caf6a23aa026a49d6e72ef4c2118e8ebb9f4449",
    "0x5973ccb98510cb3167635a38125d0b55a9dc653a",
    "0x5473206680f6e09f3e9c012fba98a052a48f3de6",
    "0x765b583b7f44bf7d3b4a5b39cc7c1c2597ed3b19",
    "0xcacccbe47a50b0065d021107ce4f36a9611110b8",
    "0x829a63bde33f3c2416c66f55500afbc8ca1343ff",
    "0x890fb3cf2a742aa8f2f2e90936b066c445c74775",
    "0x7b026003275b579011ef17d77b86cddb85885030",
    "0xd6d933b80c385f14dc69b08cd320c723ac9e96d2",
    "0x7f60a71e525974ccc75552068e15ad1c55870d16",
    "0x1db229799c214fbf82d30e459b1f3f4ce673d97c",
    "0x8267abef3d222eae50359675940ef8e11040c095",
    "0xa69235c1d5a8adfd890bc0b34c19850e5dc92d64",
    "0xae6f06db10d08f4eec03ed8f637406ff7a377188",
    "0xbd11260ecafe687f9d1a43c5b1cc275a28955584",
    "0x210eb69a474ba954288dc9fe9524cbf5c01c7055",
    "0x9fbd29d496e324028d03c0320414e2353cd7a57f",
    "0xd3813b5dc65a7f402978571bda9f168d5e8567fd",
    "0x87c91b788227fd0e219b852cdc21d82876c3e683",
    "0x41cc87b501f46c47771209094d1ee276b02fbf7e",
    "0x17ce6590d94c588894529cd806f30c282b91f8fb",
    "0x9321f558ba418666cbb2d5d2b5bcd5aaeb41ac69",
    "0xc4d326042bb4640734e8f0f8f7e1e3f673112d61",
    "0xcadda21f6535305775caa88c12ef18fff5c2f9a5",
    "0xc6c3c2978bab7a1f204df5a72cf20f740402957d",
    "0xa156d6e67408d53adf74aa3ca97549ec66856e08",
    "0x9241ec02b9b2f09587fa0f706568da607a969b24",
    "0x818222f1fb4616714dbd32b47334348d26b1c843",
    "0x663cd8e1079d684e00ff6d3881adca0ca8f52529",
    "0x7ef5fb32a752b51a09afd3b785b8e5ca91f49318",
    "0xc073ac834340d6e81a58084c86004b1b4de67ecb",
    "0x07ba67cf64fbffa2e367cf6b2bde21683a0e576d",
    "0xdfc12b853cb33afb655e446e1379b84380642f85",
    "0x6f8b7c88236dbf49506d7de2218553dd26ed732c",
    "0xee01a96d0dfee523d545834e72e2c14a82e9d22c",
    "0x4443f89bc56d2c26a15a20f77328e7f0feef816c",
    "0x88789e95370e9a76a4f7e5b3b1c66ed7b77a2376",
    "0xba1ec91d4ed6b362d949d690243eac6434080439",
    "0xdc41e1a0d0e2dc0c5c9a33588c0fcac1969a7608",
    "0xdbf2a60ec785df5bffa18da8a4ab27258b2d0745",
    "0x96db2dd2db1b342574aacf1c5f7c0068f4bd31f1",
    "0x6039622ce8849bda6632508388e0d256f2388012",
    "0x2ce8c9169f9fa53c51ceab64a25df50f92bfe6b3",
    "0x42d7548a91af2569ccfb6cfa8fa6655476ecce57",
    "0x234d5bfb8802b0e9228a0d7134f37c242ec1bb33",
    "0x187acc327fd08c0559d22d8683d9384a3d1cf66c",
    "0x7058178628da9365937903908f24bb9108e393f1",
    "0x46f257f48fc2ba94a41b69c8ffdd190bfd7911e8",
    "0x0c5688160ca53950cfa6d2e8e914c074ff081aae",
    "0x5f9f60a4ea2d24277175704b9a76fd14baa4c829",
    "0xc548b33fa5a10b876a051667e7f4b28762a64440",
    "0x570b04c8e75bf25dc9e1ed24d072240c17c032af",
    "0xf0ab9b607e1159d56f2d30c92d250e3bef769df9",
    "0xd77aefa11862b25758ba29cb6bdc080f530fe97f",
    "0x34f306824da7180d88f3c5d26445d623647af548",
    "0x1fcaf3984d0495b4eba8148770bed671c32931bf",
    "0xb9c3e1bf9bbed19b49f25bdf8c2f0b5c8b94614d",
    "0xd13d8e0f9430904f5cf50ad13c4f9eac74001aae",
    "0x6edf3b79b38444e9b49eecd0de6d98abe5d75571",
    "0x1b9f712555204003ccd563e824f7c3beebc8cad8",
    "0x4117793e86af41253abe6ad7d99992a63866ee13",
    "0xcd353aea4dc36e25441e23fafe9afa737e351088",
    "0x7d583a3c3e45918b37f29ee604e991125fef56fa",
    "0x71d7dcc8881172db79f87c6ce3fd780e54c3eefe",
    "0x46771340fa1d94b21970ffe1890139dab84f39a0",
    "0xaf18ab8c30ffba33e94c22aba7d1c17435ea23fb",
    "0x7132d118a11cc2f7595427dfd62229c3815494cc",
    "0x2f3e4b86a811df31b83dbb66dd83f6836bcaf81f",
    "0x1445b237ced4c21d5b53523cc14e59ab1650a5c3",
    "0x336f4b502369732316b07f2f286c1246307c6508",
    "0x58fc7ad27c3c7ff9437f6f2b3e90f76acd7bd846",
    "0xc3c475f4573d679a11d348a909f0a92135629477",
    "0xfc8a69bd91d88f25c56d92f3c74df29a381e82dd",
    "0xaeb627018ff39a4aa476ffbf0fe1d1c47b73f626",
    "0xcfb3e10624b94a57a63e868e9c4c289ba10a71a4",
    "0xff8cfc1e58ae8033bad020449b331aae6edfa583",
    "0x9a3d00081749601f289133eef9ff34edef198b9a",
    "0xc3de73437f2b85ecb0b2887a691089910becd86a",
    "0xc9c8c1a36be60a62a0949f7128456e18edf84650",
    "0xeb9a0f2cdd0dc138bc250c12ab7094250f4948ba",
    "0x9d01f602c259b98b9709b6696a66405580ca090b",
    "0x6d38c32937c9a720db57e04dad0128b6f2d956f8",
    "0xc47673734795a8be87897993ea897709135aed70",
    "0x5506fa33356b6a666dd0e4bc83a9c09cbd66ab8c",
    "0xeaf2a7bbe426c83379ffbec22cc79fcdac687ab9",
    "0x4c1d7c370d176dafb6ed10335bd962acb4012f87",
    "0x7325ca9582adca0462c8db0bd0e5189229e4c6d5",
    "0x27c8f67a4144a23de7460f43c99b09a5ab91c15d",
    "0x8331961e905759594735dbd87f22202d46ff9b25",
    "0x9525392937c84a304a4c53c6163446062ad1fae3",
    "0x9bd4465c2272f2c3a60577e771c4797447519555",
    "0x0221e36474be19331e8dca7fc2cf79ce21608a3c",
    "0xbfbd81a52f11139b8fc0ec11090f990bf0d18296",
  ];

  const sleep = async (milliseconds: number) => {
    await new Promise((resolve) => {
      return setTimeout(resolve, milliseconds);
    });
  };

  let tokensIndex = 1;
  const tokensTotal = allTokens.length;

  for await (const item of allTokens) {
    const token = await ethers.getContractAt("TalentTokenMigration", item);

    console.log("Migrating token:", item);

    const mintingAvailability = await token.mintingAvailability();
    if (mintingAvailability.toString() > "0") {
      console.log("skipped:", item);
    } else {
      const estimatedGasPrice = await token
        .connect(owner)
        .estimateGas.setInternalState(factory.address, "0xE23104E89fF4c93A677136C4cBdFD2037B35BE67");

      const tx = await token
        .connect(owner)
        .setInternalState(factory.address, "0xE23104E89fF4c93A677136C4cBdFD2037B35BE67", {
          gasLimit: estimatedGasPrice.mul(280).div(100),
        });
      await tx.wait();
      await sleep(5000);
    }

    console.log(`${tokensIndex} done out of ${tokensTotal}`);
    tokensIndex += 1;
  }
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
