pragma solidity 0.4.25;

import "./token/ERC20Detailed.sol";
import "./token/ERC20.sol";


// Talent Protocol ERC20 token including Factory
contract TalentProtocol is ERC20Detailed, ERC20 {

    constructor(
        string _name,
        string _symbol,
        uint8 _decimals,
        uint _initialSupply
    ) public ERC20Detailed(_name, _symbol, _decimals) {
        _mint(msg.sender, _initialSupply);
    }
    
}
