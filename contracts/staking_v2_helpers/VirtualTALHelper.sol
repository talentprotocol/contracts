// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    IAccessControlEnumerableUpgradeable,
    AccessControlEnumerableUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

interface IVirtualTALHelper {
    /// set the virtual TAL contract address
    function setVirtualTALAddress() external view returns (uint256);
}

/// @title A two-phase contract, starting with a stable coin and proceeding to
//    a alternative token once possible.
///
/// @notice Since the first phase of staking will be done in a USD-pegged
///   stable-coin, we need a mechanism to later /   switch to the TAL token, while
///   also converting any initial USD stakes to TAL, given a pre-determined rate
abstract contract VirtualTALHelper is Initializable, AccessControlEnumerableUpgradeable {
    /// address for Virtual TAL smart contract
    address public virtualTALAddress;

    function __VirtualTALHelper_init() public initializer {}

    /// Sets the virtual TAL contract address
    ///
    /// @param _address The contract address
    function setVirtualTALAddress(address _address) public onlyRole(DEFAULT_ADMIN_ROLE) {
        virtualTALAddress = _address;
    }
}
