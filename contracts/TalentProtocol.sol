// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {ERC1363} from "./tokens/ERC1363.sol";

/// @title The Talent Protocol's platform token.
///
/// @notice This is a simple, fixed-supply ERC20 token with ERC1363 capabilities.
contract TalentProtocol is ERC1363 {
    constructor() ERC1363("Talent Protocol", "TAL") {
        _mint(msg.sender, 10000 ether);
    }
}
