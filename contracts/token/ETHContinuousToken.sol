pragma solidity 0.8.7;

import "./ContinuousToken.sol";


contract ETHContinuousToken is ContinuousToken {
    uint256 internal reserve;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint _initialSupply,
        uint32 _reserveRatio
    ) payable ContinuousToken(_name, _symbol, _decimals, _initialSupply, _reserveRatio) {
        reserve = msg.value;
    }


    function mint(uint _minReceived) public payable {
        uint purchaseAmount = msg.value;
        _continuousMint(purchaseAmount, _minReceived);
        reserve += purchaseAmount;
    }

    function burn(uint _amount, uint _minReceived) public {
        uint refundAmount = _continuousBurn(_amount, _minReceived);
        reserve -= refundAmount;
        payable(msg.sender).transfer(refundAmount);
    }

    function reserveBalance() public view override returns (uint) {
        return reserve;
    }

    fallback() external { revert("Cannot call fallback function."); }
}
