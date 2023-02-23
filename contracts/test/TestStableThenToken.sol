// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {StableThenToken} from "../staking_helpers/StableThenToken.sol";

contract TestStableThenToken is StableThenToken {
    function initialize(address _stableCoin) public virtual initializer {
        __StableThenToken_init(_stableCoin);
    }

    function test_stablePhaseOnly() public view stablePhaseOnly {}

    function test_tokenPhaseOnly() public view tokenPhaseOnly {}
}
