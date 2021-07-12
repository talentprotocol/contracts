pragma solidity 0.4.25;

import "./curves/BancorBondingCurve.sol";

contract CareerCoin is BancorBondingCurve{
    uint256 internal reserve;

    string public symbol;
    string public name;
    uint8 public decimals;
    uint public initialSupply;
    uint256 private totalSupply;

    address public talentAddress;
    uint256 public talentFee;
    
  
    constructor(string _symbol, string _name, uint8 _decimals, uint _initialSupply, uint32 _reserveRatio, address _talentAddress, uint256 _talentFee) public BancorBondingCurve(_reserveRatio) {
        symbol = _symbol;
        name = _name;
        decimals = _decimals;
        initialSupply = _initialSupply;
        talentAddress = _talentAddress;
        talentFee = _talentFee;
    }


    function mint() public payable {
        uint purchaseAmount = msg.value;
        reserve = reserve.add(purchaseAmount);
        _continuousMint(purchaseAmount);
    }

    function burn(uint _amount) public {
        uint refundAmount = _continuousBurn(_amount);
        reserve = reserve.sub(refundAmount);
        msg.sender.transfer(refundAmount);
    }

    function reserveBalance() public view returns (uint) {
        return reserve;
    }

    function _continuousMint(uint _deposit) internal returns (uint) {
        require(_deposit > 0, "Deposit must be non-zero.");

        //uint rewardAmount = getContinuousMintReward(_deposit);
        // _mint(msg.sender, rewardAmount);
        return 1;
    }

    function _continuousBurn(uint _amount) internal returns (uint) {
        require(_amount > 0, "Amount must be non-zero.");
        //require(balanceOf(msg.sender) >= _amount, "Insufficient tokens to burn.");

        //uint refundAmount = getContinuousBurnRefund(_amount);
        //_burn(msg.sender, _amount);
        return 1;
    } 

    function continuousSupply() public view returns (uint) {
        return totalSupply;
    }

    function () public { revert("Cannot call fallback function."); }
}
