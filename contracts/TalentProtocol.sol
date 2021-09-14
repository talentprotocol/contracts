// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import { ERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/// @title The Talent Protocol's platform token.
///
/// @notice This is a simple, fixed-supply ERC20 token.
contract TalentProtocol is ERC20, ERC165 {
  constructor() ERC20("Talent Protocol", "TAL") {
    _mint(msg.sender, 10000 ether);
  }

  /// @inheritdoc ERC165
  function supportsInterface(bytes4 interfaceId) public pure override(ERC165) returns (bool) {
    return interfaceId == type(ERC165).interfaceId
      || interfaceId == type(IERC20).interfaceId;
  }
}
