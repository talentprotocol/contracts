// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MultiSendErc20
 * @notice A utility contract for sending ERC20 tokens to multiple recipients in a single transaction
 */
contract MultiSendErc20 {
    using SafeERC20 for IERC20;

    /// @notice Maximum number of recipients allowed in a single batch
    uint256 public constant ARRAY_LIMIT = 200;

    /// @dev Custom errors for gas-efficient reverts
    error MismatchedArrays();
    error ArrayLengthExceedsLimit();

    /// @notice Emitted when a batch of ERC20 transfers is completed
    /// @param total The total amount of tokens sent
    event Multisended(uint256 total);

    /**
     * @notice Send ERC20 tokens to multiple recipients in a single transaction
     * @param _token Address of the ERC20 token to send
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts to send to each recipient
     * @dev The caller must approve this contract to pull the total amount before calling
     * @dev Arrays must have matching lengths and not exceed ARRAY_LIMIT
     */
    function multisendERC20(
        address _token,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external {
        uint256 length = _recipients.length;
        if (length != _amounts.length) revert MismatchedArrays();
        if (length > ARRAY_LIMIT) revert ArrayLengthExceedsLimit();

        IERC20 token = IERC20(_token);

        uint256 total = 0;
        for (uint256 i = 0; i < length; ) {
            unchecked {
                total += _amounts[i];
                ++i;
            }
        }

        // Pull total amount from caller to contract
        token.safeTransferFrom(msg.sender, address(this), total);

        // Distribute tokens from contract to recipients
        for (uint256 i = 0; i < length; ) {
            token.safeTransfer(_recipients[i], _amounts[i]);
            unchecked {
                ++i;
            }
        }

        emit Multisended(total);
    }

    /**
     * @notice Send ERC20 tokens using transferFrom for each recipient
     * @param _token Address of the ERC20 token to send
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts to send to each recipient
     * @dev Caller must approve the contract to spend at least the sum of amounts
     * @dev Uses safeTransferFrom per recipient instead of pulling once and transferring
     */
    function multisendERC20From(
        address _token,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external {
        uint256 length = _recipients.length;
        if (length != _amounts.length) revert MismatchedArrays();
        if (length > ARRAY_LIMIT) revert ArrayLengthExceedsLimit();

        IERC20 token = IERC20(_token);

        uint256 total = 0;
        for (uint256 i = 0; i < length; ) {
            token.safeTransferFrom(msg.sender, _recipients[i], _amounts[i]);
            unchecked {
                total += _amounts[i];
                ++i;
            }
        }

        emit Multisended(total);
    }

    /**
     * @notice Send ERC20 tokens without SafeERC20 helpers (raw transfer/transferFrom)
     * @param _token Address of the ERC20 token to send
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts to send to each recipient
     * @dev This function uses raw ERC20 calls and may not work with non-standard tokens
     * @dev Caller must approve the contract to spend at least the sum of amounts
     */
    function multisendERC20Unsafe(
        address _token,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external {
        uint256 length = _recipients.length;
        if (length != _amounts.length) revert MismatchedArrays();
        if (length > ARRAY_LIMIT) revert ArrayLengthExceedsLimit();

        IERC20 token = IERC20(_token);

        uint256 total = 0;
        for (uint256 i = 0; i < length; ) {
            unchecked {
                total += _amounts[i];
                ++i;
            }
        }

        // Pull total amount from caller to contract using raw transferFrom
        require(token.transferFrom(msg.sender, address(this), total));

        // Distribute tokens from contract to recipients using raw transfer
        for (uint256 i = 0; i < length; ) {
            require(token.transfer(_recipients[i], _amounts[i]));
            unchecked {
                ++i;
            }
        }

        emit Multisended(total);
    }
}


