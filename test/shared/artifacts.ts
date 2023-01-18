import TalentProtocol from "../../artifacts/contracts/TalentProtocol.sol/TalentProtocol.json";
import TalentProtocolV2 from "../../artifacts/contracts/test/TalentProtocolV2.sol/TalentProtocolV2.json";
import TalentFactory from "../../artifacts/contracts/TalentFactory.sol/TalentFactory.json";
import Staking from "../../artifacts/contracts/Staking.sol/Staking.json";
import RewardCalculator from "../../artifacts/contracts/staking_helpers/RewardCalculator.sol/RewardCalculator.json";
import CommunityUser from "../../artifacts/contracts/CommunityUser.sol/CommunityUser.json";
import CommunityMember from "../../artifacts/contracts/CommunityMember.sol/CommunityMember.json";
import TalentNFT from "../../artifacts/contracts/talent-nft/TalentNFT.sol/TalentNFT.json";
import StakingMigration from "../../artifacts/contracts/StakingMigration.sol/StakingMigration.json";
import TalSubdomainRegistrar from "../../artifacts/contracts/subdomain-registrar/TalSubdomainRegistrar.sol/TalSubdomainRegistrar.json";

// test-only contracts
import USDTMock from "../../artifacts/contracts/test/ERC20Mock.sol/USDTMock.json";
import ERC20Mock from "../../artifacts/contracts/test/ERC20Mock.sol/ERC20Mock.json";
import ERC20MockWithoutErc165 from "../../artifacts/contracts/test/ERC20Mock.sol/ERC20MockWithoutErc165.json";
import TestStableThenToken from "../../artifacts/contracts/test/TestStableThenToken.sol/TestStableThenToken.json";
import InterfaceIDs from "../../artifacts/contracts/test/InterfaceIDs.sol/InterfaceIDs.json";
import TestRewardCalculator from "../../artifacts/contracts/test/TestRewardCalculator.sol/TestRewardCalculator.json";
import TestResolver from "../../artifacts/contracts/subdomain-registrar/test/TestResolver.sol/TestResolver.json";
import TestDNSSEC from "../../artifacts/contracts/subdomain-registrar/test/TestDNSSEC.sol/TestDNSSEC.json";
import ENSRoot from "@ensdomains/ens-contracts/artifacts/contracts/root/Root.sol/Root.json";
import ENSRegistry from "@ensdomains/ens-contracts/artifacts/contracts/registry/ENSRegistry.sol/ENSRegistry.json";
import DnsRegistrar from "@ensdomains/ens-contracts/artifacts/contracts/dnsregistrar/DNSRegistrar.sol/DNSRegistrar.json";
import SimplePublicSuffixList from "@ensdomains/ens-contracts/artifacts/contracts/dnsregistrar/SimplePublicSuffixList.sol/SimplePublicSuffixList.json";

export {
  TalentProtocol,
  TalentProtocolV2,
  TalentFactory,
  Staking,
  StakingMigration,
  RewardCalculator,
  TalSubdomainRegistrar,
  USDTMock,
  ERC20Mock,
  ERC20MockWithoutErc165,
  TestStableThenToken,
  InterfaceIDs,
  TestRewardCalculator,
  TestResolver,
  ENSRegistry,
  DnsRegistrar,
  TestDNSSEC,
  SimplePublicSuffixList,
  ENSRoot,
  CommunityUser,
  CommunityMember,
  TalentNFT
};
