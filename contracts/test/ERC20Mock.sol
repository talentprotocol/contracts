// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract ERC20Mock is ERC20 {
  constructor(string memory name, string memory symbol) ERC20(name, symbol) {
    console.log(1000 ether);
    console.log(1000 * 10**18);
    _mint(msg.sender, 1000 * 10**18);
  }
}
