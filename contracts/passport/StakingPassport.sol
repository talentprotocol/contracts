// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PassportRegistry.sol";

contract StakingPassport is Ownable, ReentrancyGuard {
    PassportRegistry public passportRegistry;
    uint256 public minimumStakeTime = 60 days;
    uint256 public minimumSlashTime = 30 days;

    struct StakeData {
        address staker;
        uint256 passportId;
        uint256 startStakeTime;
        uint256 unlockStakeTime;
        uint256 amount;
        uint256 retrievedAmount;
        uint256 slashedAmount;
        string slashedReason;
    }

    mapping(address => mapping(uint256 => StakeData)) public stakes;

    event Stake(address origin, uint256 passportId, uint256 amount);
    event Unstake(address origin, uint256 passportId, uint256 amount);
    event Slash(address staker, uint256 passportId, uint256 amount, string reason);

    constructor(address _passportRegistryAddress) Ownable(msg.sender) {
        passportRegistry = PassportRegistry(_passportRegistryAddress);
    }

    function stake(uint256 _passportId) payable public {
        require(passportRegistry.idPassport(_passportId) != address(0), "Passport ID does not exist");
        require(msg.value > 0, "Must stake an amount higher than 0");

        StakeData storage stakeData = stakes[msg.sender][_passportId];
        stakeData.staker = msg.sender;
        stakeData.passportId = _passportId;
        stakeData.startStakeTime = block.timestamp;
        stakeData.unlockStakeTime = block.timestamp + minimumStakeTime;
        stakeData.amount = stakeData.amount + msg.value;

        emit Stake(msg.sender, _passportId, msg.value);
    }

    function unstake(uint256 _passportId, uint256 amount) public {
        StakeData storage existingStake = stakes[msg.sender][_passportId];
        uint256 amountAvailableToRetrieve = existingStake.amount - existingStake.retrievedAmount - existingStake.slashedAmount;
        require(amountAvailableToRetrieve > 0, "Stake must have funds to retrieve");
        require(amount <= amountAvailableToRetrieve, "You cannot withdraw more than you have staked");
        require(existingStake.unlockStakeTime < block.timestamp, "Your stake is not unlocked");

        existingStake.retrievedAmount = existingStake.retrievedAmount + amount;
        payable(msg.sender).transfer(amount);

        if(existingStake.retrievedAmount == existingStake.amount) {
            delete stakes[msg.sender][_passportId];
        }

        emit Unstake(msg.sender, _passportId, amount);
    }

    function slash(uint256 _passportId, uint256[] calldata amounts, address[] calldata stakers, string calldata reason) public onlyOwner {
        require(amounts.length == stakers.length, "the size of the stakers must be the same as the size of amounts");

        for (uint256 i = 0; i < amounts.length; i++) {
            uint256 amount = amounts[i];
            address staker = stakers[i];
            _slash(_passportId, amount, staker, reason);
        }
    }

    function _slash(uint256 _passportId, uint256 amount, address staker, string calldata reason) private {
        StakeData storage existingStake = stakes[staker][_passportId];
        uint256 amountAvailableToSlash = existingStake.amount - existingStake.retrievedAmount - existingStake.slashedAmount;
        require(amountAvailableToSlash > 0, "There is nothing left to slash");
        require(amountAvailableToSlash >= amount, "You can't slash that much");
        require(existingStake.startStakeTime + minimumSlashTime >= block.timestamp, "Not enough time has passed to slash this stake");
        // require(reason != "", "You must name a reason to slash");

        existingStake.slashedAmount = existingStake.slashedAmount + amount;
        payable(msg.sender).transfer(amount);

        emit Slash(staker, _passportId, amount, reason);
    }
}