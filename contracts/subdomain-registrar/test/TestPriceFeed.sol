pragma solidity ^0.8.7;

/**
 * @dev A test price feed implementation
 */
contract TestPriceFeed {
    int256 public price;

    constructor(int256 initialPrice) {
        price = initialPrice;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        // We only care about the price
        return (1, price, 1, 0, 0);
    }
}
