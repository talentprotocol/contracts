pragma solidity ^0.8.7;

/**
 * @dev A test resolver implementation
 */
contract TestENS {
    mapping (bytes32 => address) addresses;

    constructor() {
    }

    function addr(bytes32 node) public view returns (address) {
        return addresses[node];
    }

    function setAddr(bytes32 node, address accountAddr) public {
        addresses[node] = accountAddr;
    }
}
