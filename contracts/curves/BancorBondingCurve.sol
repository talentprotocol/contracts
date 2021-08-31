pragma solidity 0.8.7;

import "../math/BancorFormula.sol";

interface IBondingCurve {
    function getContinuousMintReward(uint _reserveTokenAmount) external view returns (uint);
    function getContinuousBurnRefund(uint _continuousTokenAmount) external view returns (uint);
}

abstract contract BancorBondingCurve is IBondingCurve, BancorFormula {
    /*
        reserve ratio, represented in ppm, 1-1000000
        1/3 corresponds to y= multiple * x^2
        1/2 corresponds to y= multiple * x ---> Using now this reserve ratio for Talent Protocol
        2/3 corresponds to y= multiple * x^1/2
    */
    uint32 public reserveRatio;

    constructor(uint32 _reserveRatio) {
        reserveRatio = _reserveRatio;
    }

    function getContinuousMintReward(uint _reserveTokenAmount) public view override returns (uint) {
        return calculatePurchaseReturn(continuousSupply(), reserveBalance(), reserveRatio, _reserveTokenAmount);
    }

    function getContinuousBurnRefund(uint _continuousTokenAmount) public view override returns (uint) {
        return calculateSaleReturn(continuousSupply(), reserveBalance(), reserveRatio, _continuousTokenAmount);
    }

    function continuousSupply() public view virtual returns (uint);

    function reserveBalance() public view virtual returns (uint);
}
