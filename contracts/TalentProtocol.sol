pragma solidity 0.8.7;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Talent Protocol ERC20 token including Factory
contract TalentProtocol is ERC20 {
    uint8 private customDecimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint _supply
    ) ERC20(_name, _symbol) {
        customDecimals = _decimals;
        _mint(msg.sender, _supply);
    }

    function decimals() public view override returns (uint8) {
        return customDecimals;
    }

    /*
    function sendTokensForTesting(address _address) public returns (bool) {
        return transfer(_address, 10000);
    }
    */
}
