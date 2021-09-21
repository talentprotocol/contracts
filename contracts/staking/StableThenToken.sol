// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

/// @title A helper contract that switches operation from a stable-coin to a regular token,
///   once the token is available and set
///
/// @notice Since the first phase of staking will be done in a USD-pegged stable-coin, we need a mechanism to later
///   switch to the TAL token, while also converting any initial USD stakes to TAL, given a pre-determined rate
abstract contract StableThenToken {
    using ERC165Checker for address;

    /// stable coin to use
    address public immutable stableCoin;

    /// the token to stake
    address public token;

    /// @param _stableCoin The USD-pegged stable-coin contract to use
    constructor(address _stableCoin) {
        // USDT does not implement ERC165, so we can't do much more than this
        require(_stableCoin != address(0), "stable-coin address must be valid");

        stableCoin = _stableCoin;
    }

    /// Sets the TAL token address
    ///
    /// @param _token ERC20 address of the TAL token. Must be a valid ERC20 token with the symbol "TAL";
    function setToken(address _token) public stablePhaseOnly {
        require(_token != address(0x0), "Address must be set");
        require(_token.supportsInterface(type(IERC20).interfaceId), "not a valid ERC20 token");
        // require(ERC165(_token).supportsInterface(type(IERC20).interfaceId), "not a valid ERC20 token");

        ERC20 erc20 = ERC20(_token);
        require(strcmp(erc20.symbol(), "TAL"), "token name is not TAL");

        token = _token;
    }

    /// Allows execution only while in stable phase
    modifier stablePhaseOnly() {
        require(!_isTokenSet(), "Stable coin disabled");
        _;
    }

    /// Allows execution only while in token phase
    modifier tokenPhaseOnly() {
        require(_isTokenSet(), "TAL token not yet set");
        _;
    }

    function _isTokenSet() internal view returns (bool) {
        return token != address(0x0);
    }

    /// Checks equality of two strings
    function strcmp(string memory a, string memory b) private pure returns (bool) {
        return memcmp(bytes(a), bytes(b));
    }

    /// Checks equality of two byte sequences, both in length and in content
    function memcmp(bytes memory a, bytes memory b) private pure returns (bool) {
        return (a.length == b.length) && (keccak256(a) == keccak256(b));
    }
}
