import { ethers, network } from "hardhat";

import { deploySmartBuilderScore } from "../shared";

const setup = {
  baseSepolia: {
    trustedSigner: "0x33041027dd8F4dC82B6e825FB37ADf8f15d44053",
    passportBuilderScoreAddress: "0x5aAc3DE18d3b836f2F8E0A2386628DC30bCb5081",
    passportSourcesAddress: "0x3C0D9c2d4126CD4cd4a346770Cb2a151DBA86C50",
    passportRegistryAddress: "0xa600b3356c1440B6D6e57b0B7862dC3dFB66bc43",
    feeReceiver: "0x33041027dd8F4dC82B6e825FB37ADf8f15d44053",
    passportAttesterAddress: "0xeBDcDA147983951d8090305f29c851AcbEad2244",
  },
} as Record<string, Record<string, string>>;

async function main() {
  console.log(`Deploying builder score onchain at ${network.name}`);

  const config = setup[network.name];

  if (!config) {
    throw new Error("missing setup for network");
  }

  const [admin] = await ethers.getSigners();

  console.log(`Admin will be ${admin.address}`);

  const smartBuilderScore = await deploySmartBuilderScore(
    config.trustedSigner,
    config.passportBuilderScoreAddress,
    config.passportSourcesAddress,
    config.passportRegistryAddress,
    config.feeReceiver,
    config.passportAttesterAddress
  );

  console.log(`Smart Builder Score: ${smartBuilderScore.address}`);
  console.log(
    "Dont forget to add this contract as a trusted source on the passport builder score at ",
    config.passportBuilderScoreAddress
  );
  console.log(
    "Dont forget to add this contract as a trusted source on the passport attester at ",
    config.passportAttesterAddress
  );

  console.log(`Run this to verify the contract:`);
  console.log(
    `npx hardhat verify --network ${network.name} ${smartBuilderScore.address} "${config.trustedSigner}" "${config.passportBuilderScoreAddress}" "${config.passportSourcesAddress}" "${config.passportRegistryAddress}" "${config.feeReceiver}" "${config.passportAttesterAddress}"`
  );

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
