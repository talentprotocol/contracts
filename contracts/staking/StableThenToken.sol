// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { ERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC165Checker } from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

/**
 * @title A helper contract that switches operation from a stable-coin to a regular token,
 *   once the token is available and set
 *
 * @notice Since the first phase of staking will be done in a USD-pegged stable-coin, we need a mechanism to later
 *   switch to the TAL token, while also converting any initial USD stakes to TAL, given a pre-determined rate
 */
abstract contract StableThenToken {
  using ERC165Checker for address;

  /// @notice stable coin to use
  address public immutable stableCoin;

  /// @notice the token to stake
  address public token;

  /// @notice The price (in USD cents) of a single TAL token
  uint public tokenPrice;

  /**
   * @param _stableCoin The USD-pegged stable-coin contract to use
   * @param _tokenPrice The price of a tal token in the give stable-coin (50 means 1 TAL = 0.50USD)
   */
  constructor(
    address _stableCoin,
    uint _tokenPrice
  ) {
    require(_stableCoin != address(0), "stable-coin address must be valid");
    require(_tokenPrice > 0, "tokenPrice cannot be 0");

    stableCoin = _stableCoin;
    tokenPrice = _tokenPrice;
  }

  /**
   * @notice Converts a given USD amount to TAL
   * @param _usd The amount of USD, in cents, to convert
   * @return The converted TAL amount
   */
  function convertUsdToToken(uint _usd) internal view returns (uint) {
    return _usd / tokenPrice;
  }

  /**
   * @notice Sets the TAL token address
   * @param _token ERC20 address of the TAL token. Must be a valid ERC20 token with the symbol "TAL";
   */
  function setToken(address _token) public stablePhaseOnly {
    require(_token != address(0x0), "Address must be set");
    require(_token.supportsInterface(type(IERC20).interfaceId), "not a valid ERC20 token");
    // require(ERC165(_token).supportsInterface(type(IERC20).interfaceId), "not a valid ERC20 token");

    ERC20 erc20 = ERC20(_token);
    require(strcmp(erc20.symbol(), "TAL"), "token name is not TAL");

    token = _token;
  }

  /**
   * Allows execution only while in stable phase
   */
  modifier stablePhaseOnly() {
    require(token == address(0x0), "Stable coin disabled");
    _;
  }

  /**
   * Allows execution only while in token phase
   */
  modifier tokenPhaseOnly() {
    require(token != address(0x0), "TAL token not yet set");
    _;
  }

  /**
   * Checks equality of two strings
   */
  function strcmp(string memory a, string memory b) private pure returns (bool) {
    return memcmp(bytes(a), bytes(b));
  }

  /**
   * Checks equality of two byte sequences, both in length and in content
   */
  function memcmp(bytes memory a, bytes memory b) private pure returns (bool) {
    return (a.length == b.length) && (keccak256(a) == keccak256(b));
  }
}
