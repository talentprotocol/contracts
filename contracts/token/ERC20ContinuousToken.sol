pragma solidity 0.8.7;

import "./ContinuousToken.sol";

contract ERC20ContinuousToken is ContinuousToken {
    ERC20 public reserveToken;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint _initialSupply,
        uint32 _reserveRatio,
        address _reserveTokenAddress
    ) ContinuousToken(_name, _symbol, _decimals, _initialSupply, _reserveRatio) {
        reserveToken = ERC20(_reserveTokenAddress);
    }

    fallback() external { revert("Cannot call fallback function."); }

    function mint(uint _amount, uint _minReceived) public {
        _continuousMint(_amount, _minReceived);
        require(reserveToken.transferFrom(msg.sender, address(this), _amount), "mint() ERC20.transferFrom failed.");
    }

    function burn(uint _amount, uint _minReceived) public {
        uint returnAmount = _continuousBurn(_amount, _minReceived);
        require(reserveToken.transfer(msg.sender, returnAmount), "burn() ERC20.transfer failed.");
    }

    function reserveBalance() public view override returns (uint) {
        return reserveToken.balanceOf(address(this));
    }
}
