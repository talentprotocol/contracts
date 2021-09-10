// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title The Talent Protocol's platform token.
 *
 * @notice This is a simple, fixed-supply ERC20 token.
 */
contract TalentProtocol is ERC20 {
    uint8 private customDecimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint _supply
    ) ERC20(_name, _symbol) {
        _mint(msg.sender, _supply);
    }
}
