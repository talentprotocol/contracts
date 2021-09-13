// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

import { StableThenToken } from "./staking/StableThenToken.sol";

contract Staking is StableThenToken {
  struct Stake {
    address owner;
    uint amount;
  }

  uint public totalStableAmount;

  mapping(address => Stake) public stakes;

  /**
   * @param _stableCoin The USD-pegged stable-coin contract to use
   * @param _tokenPrice The price of a tal token in the give stable-coin (50 means 1 TAL = 0.50USD)
   */
  constructor(
    address _stableCoin,
    uint _tokenPrice
  ) StableThenToken(_stableCoin, _tokenPrice) {
  }

  /**
   * @notice Creates a new stake from an amount of stable coin.
   * @notice The USD amount will be converted to the equivalent amount in TAL, according to the pre-determined rate
   *
   * @param _amount The amount of stable coin to stake
   * @return true if operation succeeds
   *
   * @notice The contract must be previously approved to spend _amount on behalf of `msg.sender`
   */
  function stakeStable(uint _amount) public stablePhaseOnly returns (bool) {
    require(stakes[msg.sender].owner == address(0x0), "address already has stake");
    // TODO do we want a min amount?
    require(_amount > 0, "amount cannot be zero");

    IERC20(stableCoin).transferFrom(msg.sender, address(this), _amount);

    totalStableAmount += _amount;
    uint _talAmount = convertUsdToToken(_amount);

    _createStake(msg.sender, _talAmount);
  }

  /**
   * @notice Creates a new stake from an amount of TAL
   *
   * @param _amount The amount of TAL tokens to stake
   * @return true if operation succeeds
   *
   * @notice The contract must be previously approved to spend _amount on behalf of `msg.sender`
   */
  function stakeToken(uint _amount) public tokenPhaseOnly returns (bool) {
    require(stakes[msg.sender].owner == address(0x0), "address already has stake");
    // TODO do we want a min amount?
    require(_amount > 0, "amount cannot be zero");

    IERC20(token).transferFrom(msg.sender, address(this), _amount);

    _createStake(msg.sender, _amount);
  }

  /**
   * @notice Terminates a stake
   *
   * @dev This function should burn the expected amount of talent tokens, and return the previously deposited TAL
   */
  function unstake() public returns (bool) {
    Stake storage stake = stakes[msg.sender];

    require(stake.owner == msg.sender, "sender does not have a stake");

    delete stakes[msg.sender];
  }

  /**
   * Private Interface
   */

  /**
    * @notice Creates a stake, given an owner and a TAL amount
    *
    * @dev This function assumes tokens have been previously transfered by the caller function
    */
  function _createStake(address owner, uint amount) private {
    require(stakes[owner].owner == address(0x0), "address already has stake");
    // TODO do we want a min amount?
    require(amount > 0, "amount cannot be zero");

    stakes[owner] = Stake(owner, amount);
  }
}
