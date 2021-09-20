// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC1363} from "@openzeppelin/contracts/interfaces/IERC1363.sol";

library InterfaceIDs {
    function erc20() public pure returns (bytes4) {
        return type(IERC20).interfaceId;
    }

    function erc165() public pure returns (bytes4) {
        return type(IERC165).interfaceId;
    }

    function erc1363() public pure returns (bytes4) {
        return type(IERC1363).interfaceId;
    }

    function accessControl() public pure returns (bytes4) {
        return type(IAccessControl).interfaceId;
    }
}
