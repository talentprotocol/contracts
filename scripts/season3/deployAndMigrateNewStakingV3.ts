import { ethers, network, upgrades, waffle } from "hardhat";
import * as StakingMigrationArtifact from "../../artifacts/contracts/StakingMigration.sol/StakingMigration.json";
import * as StakingMigrationV3Artifact from "../../artifacts/contracts/season3/staking/StakingMigrationV3.sol/StakingMigrationV3.json";
import dayjs from "dayjs";
import type { StateStakingV3, StakingMigrationV3 } from "../../typechain-types";

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("owner: ", owner.address);

  const provider = new ethers.providers.JsonRpcProvider("https://alfajores-forno.celo-testnet.org");
  const originalBlockFormatter = provider.formatter._block;
  provider.formatter._block = (value, format) => {
    return originalBlockFormatter(
      {
        gasLimit: ethers.constants.Zero,
        ...value,
      },
      format
    );
  };

  const oldStaking = await ethers.getContractAt("Staking", "0xfc35754091D1540cE605Db87e5284369D766F0bF");
  console.log("Old Staking", oldStaking.address);

  const stakingMigrationV3 = await ethers.getContractAt(
    "StakingMigrationV3",
    "0x7248460C2366CCf3ec104c26D52aA0b52D309F2A"
  );

  const globalStakes = await stakingMigrationV3.globalStakes("0xce4C7802719eF4B0039667183De79f1d691C4C73");
  console.log("globalStakes", globalStakes);

  const stake1 = await stakingMigrationV3.stakes(
    "0xce4C7802719eF4B0039667183De79f1d691C4C73",
    "0xbBc37Ea38EC834EBf296fEe21d059f0528eEBdD3"
  );
  console.log("stakes", stake1);

  const stake2 = await stakingMigrationV3.stakes(
    "0xce4C7802719eF4B0039667183De79f1d691C4C73",
    "0x543766Fc6AB468719Ad69d8dC2134B127F56865a"
  );
  console.log("stakes", stake2);

  const stake3 = await stakingMigrationV3.stakes(
    "0xce4C7802719eF4B0039667183De79f1d691C4C73",
    "0xF942f5F6A484D5a2aeC915DC133E439f1Aa5f2Cb"
  );
  console.log("stakes", stake3);

  const stake4 = await stakingMigrationV3.stakes(
    "0xce4C7802719eF4B0039667183De79f1d691C4C73",
    "0x1CF39cdcb086112bDa0f09aEbCa53ED0c477C1Fa"
  );
  console.log("stakes", stake4);

  // console.log("Beginning migration");
  // console.log("Migrating stake pairs");

  // console.log("Migrating generic variables");

  // await stakingMigrationV3.setAccumulatedState(
  //   await oldStaking.activeStakes(),
  //   await oldStaking.totalStableStored(),
  //   await oldStaking.totalTokensStaked(),
  //   await oldStaking.rewardsGiven()
  // );

  // console.log("setAccumulatedState done.");

  // await stakingMigrationV3.setRealtimeState(
  //   await oldStaking.S(),
  //   await oldStaking.SAt(),
  //   await oldStaking.totalAdjustedShares()
  // );

  // console.log("setRealtimeState done.");

  const allTX: any = [
    "0x71c9a3377d1feb342e41f86fbf0fce37218489f022d2dac22d7c1b7207968cc1",
    "0xe48598262492bf17bbe06bf0da38514ccf897a4cf7b301e9c012f8e63171b8c4",
    "0x4b8c4c415aaf0e0f41c85d49e1b30ed6adf7aa7f685a50052703e488060dddfb",
    "0x2cf4a13012599fbb11236963fc0fe1a0b93a36e929e27cd14c65a92434ac0b74",
    "0x30f2c9fc4af48d1cd65d44acc6c0e7f60c0e560c19166f1cc88ea96ae7f69fa4",
    "0xad62d1891f11ec16632de5c1b66eb910a5a040ceeb6a2fea1555796892805803",
    "0x73200c35f27b6676d29aa83fff8723432f5eaadc5e0330226a44f282b7ac55aa",
    "0x18d1c10384043fa47a5ea963f009469390c4e709d3eed71c4a49a0ddb83f0986",
    "0x270b731c188dc8f5045b73628e98b5f55ae243ee419f6a08e13a417eb76da289",
    "0xb6494c2913995b31e70f475b8707fc842b63713fed032fd2226cb1fb344681ea",
    "0xbd51324e925c88d34095479a6ac9448197e6e76f9b52e77568115f02153138f8",
    "0x60c4b06776d768abca3f17e6ea9fb01aaa3792e488f2c61bb08677e13471b370",
    "0xc3f9ab9a36f03a7e1181bd9c661c4130738934f85d5ede49435538db77b7b017",
    "0x904272f4949e0b42c28c24eafb95146c13db5aa6d6251930d7c335c167fe1797",
    "0x0e6a0826d33dd6f790f75e66b8786a34147245c999ee6ba4df1c2d6d945f41e4",
    "0x069259883f510b748868c26b2a717098140ff0fee1878ab702f4ff22d901c180",
    "0x60241df4ab0b306e54ebe856379a145612719765c6cb38ca7b01d938b3384fbd",
    "0xb3469be937ef9815dc3e3babcaba6fb8fb6a9d8f4c0f0fb623c58f40a87f8e90",
    "0x7df205a57a0a19eae68f8ca0d2b02dbd572e632b1856b0f435fab3bb2f66e99c",
    "0x88551a4acb579d3e0bf7ef2dfc94b8772f3f06a2b5cd703c62cdf05c77751dd9",
    "0xfc95f382c0c7eb6829758f263e57650bcef727e752cb48404d438c19284b2e15",
    "0x7a85eee4f9a82fb096715a76069802e7047ed4d634d438bc4f5049c704deb6ed",
    "0x8345ca6c2753c2fadc1266061e06bdb31029f016f1aa72cc4e05ec7a3967fbd0",
    "0x9ccec4a9cde5af852cc6a69f2ce996b0ba037c4f284627e08f5a9aac8cdf555c",
    "0xc01e1f0db5f85d6d2a3c5681b0d822daa01024870362a24b5b0b61e537b24139",
    "0x942646ffe14b85447b7d72c7b6f2046522641962b022432d848a86234593096c",
    "0x63f0cde23c6a10fa8205842552febef19a281cd7ef28c77f53c795935ccfd313",
    "0xc0e821f7c457f3aaa8743a3a5a8e1e8bc5af9eba8e8f60966238ed60dd898c15",
    "0x10f7ead262c82e32d2bf4bf984d3359661767e3a62409261e9935950f42b47ab",
    "0x8bffcbe5d11d95bbc6b3700b42108f28608058a66952e5c5113c9be16c584866",
    "0x01bfb9351b8303d22b336f3fb0388464486413f7eed49143ee6592ca82607b0f",
    "0xd4d6a0371cc20990c5fc39ae079052cc1d9bb7eb3141bce3327d7dbc3c2eb975",
    "0x95c15ca35567c7f69b8dcc02ca3d8a9c101b96bdc1d3d1f1619cbc0b47239c8d",
    "0xf72f846284d042b9471cf790e9714d5457b2cf13db825781d87010f518badbc2",
    "0x2e09964cec933bf5ad44d4f1ba9acbbbefcc1124fbdd81c38ae0b5f01c926a5b",
    "0xb595cfae8037332fc65d1d73a5ce37d24365fb71b3fbbc519c04921df66250cc",
    "0x161cad0488e222aee87b0572daf158e2b473fb1e864c839b802e242dd6dc51da",
    "0xfb0f14f3ce7c5266b1888819773ef7be884bfd6083469669269bd0ae47469954",
    "0x326f40c07ad7b3707edd1fc7ff48d3396bd831e49e49a844d597a77d4bf01e99",
    "0xf42e92ce4f0ae7288ff0ad5a19e231055aa8613afa07449454abb2a8e80d8280",
    "0xc93b74c8294be0720d465b27276bffc6e6b90561f394f4523715be2efb3ca465",
    "0xf605441718ca258c7ee0161ed8998146ba52fd5e879c7f613d8e67913e2618f2",
    "0x0fac17b4e09d425edb813c89aef260324740bffd2aa6e65538bf6256471cf6ce",
    "0x08bb3b46c64bfc30237e701f81d728fa76a2c41d677cca89a4123d51251de91f",
    "0xca0b0b3920f71466d11e4c4a1881dabffad98c7281615c8c3ebe3caeaef4e810",
    "0xfe0dcb5f4cf39f2f5564f3f8f19b67acb455dc58dd6bf9669747141c78a93c8c",
    "0xb95259ab5bbf979ba79d8c0c15292ae4a1c8bcd20c40ba789b8c398ea2fcc778",
    "0xd4f308fd412cce405fc1e3d564ff5ae6d56d166d87a9ced3a16a6f3387e66a8c",
    "0xe53bea69faedc17bb6a7b4ebd4c69fdbb994c231407e4a50ad70eb91929ace1a",
    "0x23b838a04d637a8c9190e75613db3a628870ce06f5e8947662094108c5de703e",
    "0xefd6292bf872e1973aa7d43c90c124e5f7ca27f6b247d60ea056c83560378ccd",
    "0x0d212928880443b3aa710121d205441d9eca8f799370069565192eb9ae704a74",
    "0x9cb0a68040b0cde4eaa55067702cc7a21e86af5db89bf3a918e5adf430e5bac9",
    "0xa2ad7b9f29749bfb408c9fdfcf3e8a6c5100e77f0d369964bb50c37654af8f2d",
    "0xbab2db331c80f328c5d3f30c7041f95af86cd342d002b954a13be253884fc9dd",
    "0x7ad67b4378d7d896e15e52bc7211d7c63b5aebdb5f72e967553ed95fef793e28",
    "0x921eaa52f89e4d6693229d332bd5201171bf93ec158bda12e6ec790e11d7daf4",
    "0x7ac2b79dbf210b8240450db2551138e332c78783f4adb09949064c5ae4a8d5a8",
    "0xdecb4ff6fcc58b3c26d901765abf072df886b4e046800859aed810fa73d9d3a7",
  ];

  console.log("Processing events");

  let txIndex = 1;
  let stakeEventsEmmited = 0;
  const txTotal = allTX.length;

  for (const tx of allTX) {
    const transaction = await provider.getTransactionReceipt(tx);
    const block = await ethers.provider.getBlock(transaction.blockHash);
    const timestamp = block.timestamp;

    const logs = transaction.logs.map((log: any) => {
      try {
        return oldStaking.interface.parseLog(log);
      } catch {
        return null;
      }
    });

    // Filter Rewards claim events
    const rewardClaimLogs = logs.filter((item) => !!item && item.name === "RewardClaim");

    if (rewardClaimLogs.length > 0) {
      for await (const item of rewardClaimLogs) {
        // console.log("Reward claim event: ", `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${item?.args[3]}`);
        const globalStake = await stakingMigrationV3.globalStake(item?.args[0]);
        await stakingMigrationV3.talentS;
      }
    }

    // Filter STAKE events
    const stakeLogs = logs.filter((item) => !!item && item.name === "Stake");

    if (stakeLogs.length > 0) {
      console.log("Emitting a Stake event");
      for await (const item of stakeLogs) {
        console.log("Stake event: ", `${item?.args[0]}, ${item?.args[1]}, ${item?.args[2]}, ${item?.args[3]}`);

        await stakingMigrationV3
          .connect(owner)
          .emitStakeEvent(item?.args[0], item?.args[1], item?.args[2], item?.args[3]);
        console.log("emitStakeEvent done");

        const stakev1 = await oldStaking.stakes(item?.args[0], item?.args[1]);
        await stakingMigrationV3.connect(owner).transferStake(item?.args[0], item?.args[1], stakev1, timestamp);
        console.log("transferStake done");

        const talentRewards = await oldStaking.talentRedeemableRewards(item?.args[1]);
        await stakingMigrationV3.connect(owner).setTalentState(item?.args[1], talentRewards);
        console.log("setTalentState");

        stakeEventsEmmited += 1;
      }
    }

    console.log(`Migrated Transaction (${txIndex}/${txTotal}) - StakeEvents emmited: ${stakeEventsEmmited}`);
    txIndex += 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
