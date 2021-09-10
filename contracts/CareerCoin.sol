// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title The base contract for Career Coins in the Talent Protocol platform.
 */
contract CareerCoin is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint _initialSupply,
        address _talent
    ) ERC20(_name, _symbol) {
        _mint(_talent, _initialSupply);
    }
}
