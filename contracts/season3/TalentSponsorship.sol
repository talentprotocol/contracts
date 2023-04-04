// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract TalentSponsorship {
    // sponsor => talent => token => amount
    mapping(address => mapping(address => mapping(address => uint256))) public sponsorships;

    // amount available for talent
    mapping(address => mapping(address => uint256)) public amountAvailableForTalent;

    // totalNumberOfSponsorships
    uint256 public totalSponsorships;

    // totalNumberOfRevokedSponsorships
    uint256 public totalRevokedSponsorships;

    // A new sponsorship has been created
    event SponsorshipCreated(
        address indexed sponsor,
        address indexed talent,
        uint256 amount,
        address indexed token,
        string symbol
    );

    // A sponsorship has been revoked
    event SponsorshipRevoked(
        address indexed sponsor,
        address indexed talent,
        uint256 amount,
        address indexed token,
        string symbol
    );

    // Talent Withdrew a given Token
    event Withdraw(address indexed talent, uint256 amount, address indexed token, string symbol);

    constructor() {
        totalSponsorships = 0;
        totalRevokedSponsorships = 0;
    }

    // Create a new sponsor position
    function sponsor(address _talent, uint256 _amount, address _token) public {
        require(IERC20(_token).balanceOf(msg.sender) >= _amount, "You don't have enough balance");
        require(
            IERC20(_token).allowance(msg.sender, address(this)) >= _amount,
            "You must first approve this smart contract to transfer"
        );

        // setup the internal state
        totalSponsorships = totalSponsorships + 1;
        sponsorships[msg.sender][_talent][_token] = sponsorships[msg.sender][_talent][_token] + _amount;
        amountAvailableForTalent[_talent][_token] = amountAvailableForTalent[_talent][_token] + _amount;

        // transfer from sender => contract
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        // emit event
        string memory symbol = IERC20Metadata(_token).symbol();
        emit SponsorshipCreated(msg.sender, _talent, _amount, _token, symbol);
    }

    // Withdraw all funds for a given token
    function withdrawToken(address _token) public {
        require(amountAvailableForTalent[msg.sender][_token] >= 0, "There are no funds for you to retrieve");

        // setup the internal state
        uint256 amount = amountAvailableForTalent[msg.sender][_token];

        require(IERC20(_token).balanceOf(address(this)) >= amount, "Smart contract does not have enough funds");
        amountAvailableForTalent[msg.sender][_token] = amountAvailableForTalent[msg.sender][_token] - amount;

        // transfer from contract => sender
        IERC20(_token).transfer(msg.sender, amount);

        // emit event
        string memory symbol = IERC20Metadata(_token).symbol();
        emit Withdraw(msg.sender, amount, _token, symbol);
    }

    // Revokes a sponsor position
    function revokeSponsor(address _talent, uint256 _amount, address _token) public {
        require(IERC20(_token).balanceOf(address(this)) >= _amount, "The contract don't have enough balance");
        require(
            sponsorships[msg.sender][_talent][_token] >= _amount,
            "The amount passed is more than the previous sponsored amount"
        );

        // setup the internal state
        totalRevokedSponsorships = totalRevokedSponsorships + 1;
        sponsorships[msg.sender][_talent][_token] = sponsorships[msg.sender][_talent][_token] - _amount;
        amountAvailableForTalent[_talent][_token] = amountAvailableForTalent[_talent][_token] - _amount;

        // transfer from contract => sender
        IERC20(_token).transfer(msg.sender, _amount);

        // emit event
        string memory symbol = IERC20Metadata(_token).symbol();
        emit SponsorshipRevoked(msg.sender, _talent, _amount, _token, symbol);
    }

    function amountAvailable(address _token) public view returns (uint256) {
        return amountAvailableForTalent[msg.sender][_token];
    }
}
