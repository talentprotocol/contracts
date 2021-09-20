// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1363Receiver} from "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";

import "hardhat/console.sol";

import {StableThenToken} from "./staking/StableThenToken.sol";

/// Staking contract
///
/// @notice During phase 1, accepts USDT, which is automatically converted into an equivalent TAL amount.
///   Once phase 2 starts (after a TAL address has been set), only TAL deposits are accepted
contract Staking is StableThenToken {
    /// Details of each individual stake
    struct Stake {
        address owner;
        uint256 amount;
    }

    /// List of all stakes
    mapping(address => Stake) public stakes;

    /// Hello
    ///
    /// @param _stableCoin The USD-pegged stable-coin contract to use
    /// @param _tokenPrice The price of a tal token in the give stable-coin (50 means 1 TAL = 0.50USD)
    constructor(address _stableCoin, uint256 _tokenPrice) StableThenToken(_stableCoin, _tokenPrice) {}

    /// Creates a new stake from an amount of stable coin.
    /// The USD amount will be converted to the equivalent amount in TAL, according to the pre-determined rate
    ///
    /// @param _amount The amount of stable coin to stake
    /// @return true if operation succeeds
    ///
    /// @notice The contract must be previously approved to spend _amount on behalf of `msg.sender`
    function stakeStable(uint256 _amount) public stablePhaseOnly returns (bool) {
        require(stakes[msg.sender].owner == address(0x0), "address already has stake");
        // TODO do we want a min amount?
        require(_amount > 0, "amount cannot be zero");

        IERC20(stableCoin).transferFrom(msg.sender, address(this), _amount);

        uint256 _talAmount = convertUsdToToken(_amount);

        _createStake(msg.sender, _talAmount);

        return true;
    }

    /// Creates a new stake from an amount of TAL
    ///
    /// @param _amount The amount of TAL tokens to stake
    /// @return true if operation succeeds
    ///
    /// @notice The contract must be previously approved to spend _amount on behalf of `msg.sender`
    function stakeToken(uint256 _amount) public tokenPhaseOnly returns (bool) {
        require(stakes[msg.sender].owner == address(0x0), "address already has stake");
        // TODO do we want a min amount?
        require(_amount > 0, "amount cannot be zero");

        IERC20(token).transferFrom(msg.sender, address(this), _amount);

        _createStake(msg.sender, _amount);

        return true;
    }

    /// Terminates a stake
    ///
    /// @dev This function should burn the expected amount of talent tokens, and return the previously deposited TAL
    function unstake() public returns (bool) {
        Stake storage stake = stakes[msg.sender];

        require(stake.owner == msg.sender, "sender does not have a stake");

        delete stakes[msg.sender];

        return true;
    }

    /// Calculates stable coin balance of the contract
    ///
    /// @return the stable coin balance
    function stableCoinBalance() public view returns (uint256) {
        return IERC20(stableCoin).balanceOf(address(this));
    }

    /// Calculates TAL token balance of the contract
    ///
    /// @return the amount of TAL tokens
    function tokenBalance() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    //
    // Private Interface
    //

    /// Creates a stake, given an owner and a TAL amount
    ///
    /// @dev This function assumes tokens have been previously transfered by the caller function
    function _createStake(address owner, uint256 amount) private {
        require(stakes[owner].owner == address(0x0), "address already has stake");
        // TODO do we want a min amount?
        require(amount > 0, "amount cannot be zero");

        stakes[owner] = Stake(owner, amount);
    }
}
