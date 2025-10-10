// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MultiSendETH
 * @notice A utility contract for sending ETH to multiple recipients in a single transaction
 */
contract MultiSendETH {
    /// @notice Maximum number of recipients allowed in a single batch
    uint8 public constant ARRAY_LIMIT = 200;

    /// @notice Emitted when a batch of ETH transfers is completed
    /// @param total The total amount of ETH sent
    event Multisended(uint256 total);

    /**
     * @notice Send ETH to multiple recipients in a single transaction
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts to send to each recipient (in wei)
     * @dev The sum of all amounts must equal msg.value
     * @dev Arrays must have matching lengths and not exceed ARRAY_LIMIT
     */
    function multisendETH(address[] calldata _recipients, uint256[] calldata _amounts) external payable {
        require(_recipients.length == _amounts.length, "Mismatched arrays");
        require(_recipients.length <= ARRAY_LIMIT, "Array length exceeds limit");

        uint256 total = 0;

        // Execute transfers
        for (uint8 i = 0; i < _recipients.length; i++) {
            total += _amounts[i];
            (bool success, ) = payable(_recipients[i]).call{value: _amounts[i]}("");
            require(success, "Transfer failed");
        }

        require(total == msg.value, "Incorrect ETH amount sent");

        emit Multisended(total);
    }
}
