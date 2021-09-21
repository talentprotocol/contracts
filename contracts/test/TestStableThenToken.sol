// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {StableThenToken} from "../staking/StableThenToken.sol";

contract TestStableThenToken is StableThenToken {
    constructor(address _stableCoin) StableThenToken(_stableCoin) {}

    function test_stablePhaseOnly() public view stablePhaseOnly {}

    function test_tokenPhaseOnly() public view tokenPhaseOnly {}
}
