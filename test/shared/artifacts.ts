import TalentProtocol from "../../artifacts/contracts/TalentProtocol.sol/TalentProtocol.json";
import TalentProtocolV2 from "../../artifacts/contracts/test/TalentProtocolV2.sol/TalentProtocolV2.json";
import TalentFactory from "../../artifacts/contracts/TalentFactory.sol/TalentFactory.json";
import Staking from "../../artifacts/contracts/Staking.sol/Staking.json";
import RewardCalculator from "../../artifacts/contracts/staking/RewardCalculator.sol/RewardCalculator.json";
import CommunityUser from "../../artifacts/contracts/CommunityUser.sol/CommunityUser.json";
import CommunityMember from "../../artifacts/contracts/CommunityMember.sol/CommunityMember.json";

// test-only contracts
import USDTMock from "../../artifacts/contracts/test/ERC20Mock.sol/USDTMock.json";
import ERC20Mock from "../../artifacts/contracts/test/ERC20Mock.sol/ERC20Mock.json";
import ERC20MockWithoutErc165 from "../../artifacts/contracts/test/ERC20Mock.sol/ERC20MockWithoutErc165.json";
import TestStableThenToken from "../../artifacts/contracts/test/TestStableThenToken.sol/TestStableThenToken.json";
import InterfaceIDs from "../../artifacts/contracts/test/InterfaceIDs.sol/InterfaceIDs.json";
import TestRewardCalculator from "../../artifacts/contracts/test/TestRewardCalculator.sol/TestRewardCalculator.json";

export {
  TalentProtocol,
  TalentProtocolV2,
  TalentFactory,
  Staking,
  RewardCalculator,
  USDTMock,
  ERC20Mock,
  ERC20MockWithoutErc165,
  TestStableThenToken,
  InterfaceIDs,
  TestRewardCalculator,
  CommunityUser,
  CommunityMember
};
