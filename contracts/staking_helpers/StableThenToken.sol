// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    IAccessControlEnumerableUpgradeable,
    AccessControlEnumerableUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";


/// @title A two-phase contract, starting with a stable coin and proceeding to
//    a alternative token once possible.
///
/// @notice Since the first phase of staking will be done in a USD-pegged
///   stable-coin, we need a mechanism to later /   switch to the TAL token, while
///   also converting any initial USD stakes to TAL, given a pre-determined rate
abstract contract StableThenToken is Initializable, AccessControlEnumerableUpgradeable {
    using ERC165Checker for address;

    /// stable coin to use
    address public stableCoin;

    /// the token to stake
    address public token;

    /// @param _stableCoin The USD-pegged stable-coin contract to use
    function __StableThenToken_init(address _stableCoin) internal virtual onlyInitializing {
        // USDT does not implement ERC165, so we can't do much more than this
        require(_stableCoin != address(0), "stable address must be valid");

        stableCoin = _stableCoin;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// Sets the TAL token address
    ///
    /// @param _token ERC20 address of the TAL token. Must be a valid ERC20 token with the symbol "TAL";
    function setToken(address _token) public onlyRole(DEFAULT_ADMIN_ROLE) stablePhaseOnly {
        require(_token != address(0x0), "Address must be set");
        require(_token.supportsInterface(type(IERC20).interfaceId), "not a valid ERC20 token");
        // require(ERC165(_token).supportsInterface(type(IERC20).interfaceId), "not a valid ERC20 token");

        ERC20 erc20 = ERC20(_token);
        require(memcmp(bytes(erc20.symbol()), bytes("TAL")), "token name is not TAL");

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

    /// Checks equality of two byte sequences, both in length and in content
    function memcmp(bytes memory a, bytes memory b) private pure returns (bool) {
        return (a.length == b.length) && (keccak256(a) == keccak256(b));
    }

    /// https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps
    uint256[49] __gap;
}
