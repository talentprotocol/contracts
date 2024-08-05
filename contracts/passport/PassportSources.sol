// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PassportSources is Ownable {
    mapping(string => address) public sources;
    constructor(address initialOwner) Ownable(initialOwner) {}

    function addSource(string memory name, address source) external onlyOwner {
        sources[name] = source;
    }

    function removeSource(string memory name) external onlyOwner {
        sources[name] = address(0);
    }
}