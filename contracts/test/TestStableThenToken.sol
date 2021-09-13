// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { StableThenToken } from "../staking/StableThenToken.sol";

contract TestStableThenToken is StableThenToken {
  constructor(
    address _stableCoin,
    uint _tokenPrice
  ) StableThenToken(_stableCoin, _tokenPrice) {
  }

  function test_convertUsdToToken(uint _usd) public view returns (uint) {
    return convertUsdToToken(_usd);
  }

  function test_stablePhaseOnly() public view stablePhaseOnly {
  }

  function test_tokenPhaseOnly() public view tokenPhaseOnly {
  }
}
