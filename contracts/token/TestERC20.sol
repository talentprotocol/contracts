pragma solidity 0.8.7;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    uint8 private customDecimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint _initialSupply
    ) ERC20(_name, _symbol) {
        customDecimals = _decimals;
        _mint(msg.sender, _initialSupply);
    }

    function decimals() public view override returns (uint8) {
        return customDecimals;
    }
}
