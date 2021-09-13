// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

library InterfaceIDs {
  function erc20() public pure returns (bytes4) {
    return type(IERC20).interfaceId;
  }

  function erc165() public pure returns (bytes4) {
    return type(ERC165).interfaceId;
  }
}
