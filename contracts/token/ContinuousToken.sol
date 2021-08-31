pragma solidity 0.8.7;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../ownership/Ownable.sol";
import "../curves/BancorBondingCurve.sol";


abstract contract ContinuousToken is Ownable, ERC20, BancorBondingCurve {
    uint8 private customDecimals;
    using SafeMath for uint;

    event Minted(address sender, uint amount, uint deposit);
    event Burned(address sender, uint amount, uint refund);

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint _initialSupply,
        uint32 _reserveRatio
    ) ERC20(_name, _symbol) BancorBondingCurve(_reserveRatio) {
        customDecimals = _decimals;
        _mint(msg.sender, _initialSupply);
    }

    function decimals() public view override returns(uint8) {
        return customDecimals;
    }

    function continuousSupply() public view override returns (uint) {
        return totalSupply(); // Continuous Token total supply
    }

    function _continuousMint(uint _deposit, uint _minReward) internal returns (uint) {
        require(_deposit > 0, "Deposit must be non-zero.");

        uint rewardAmount = getContinuousMintReward(_deposit);
        require(rewardAmount >= _minReward);
        _mint(msg.sender, rewardAmount);
        emit Minted(msg.sender, rewardAmount, _deposit);
        return rewardAmount;
    }

    function _continuousBurn(uint _amount, uint _minRefund) internal returns (uint) {
        require(_amount > 0, "Amount must be non-zero.");
        require(balanceOf(msg.sender) >= _amount, "Insufficient tokens to burn.");

        uint refundAmount = getContinuousBurnRefund(_amount);
        require(refundAmount >= _minRefund);
        _burn(msg.sender, _amount);
        emit Burned(msg.sender, _amount, refundAmount);
        return refundAmount;
    }
}
