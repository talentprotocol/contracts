// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract TalentSponsorship is Ownable {
    // sponsor => talent => token => totalAmount
    mapping(address => mapping(address => mapping(address => uint256))) public sponsorships;

    // sponsor => talent => token => amountAvailable
    mapping(address => mapping(address => mapping(address => uint256))) public amountAvailableForSponsorship;

    // talent => token => amountAvailable
    mapping(address => mapping(address => uint256)) public amountAvailableForTalent;

    // totalNumberOfSponsorships
    uint256 public totalSponsorships;

    // totalNumberOfRevokedSponsorships
    uint256 public totalRevokedSponsorships;

    // totalNumberOfClaimedSponsorships
    uint256 public totalClaimedSponsorships;

    // flag to enable or disable the contract
    bool public enabled = true;

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

    // Talent Withdrew a given Token from a sponsorship
    event Withdraw(
        address indexed sponsor,
        address indexed talent,
        uint256 amount,
        address indexed token,
        string symbol
    );

    constructor(address contractOwner) {
        totalSponsorships = 0;
        totalRevokedSponsorships = 0;
        totalClaimedSponsorships = 0;
        transferOwnership(contractOwner);
    }

    modifier onlyWhileEnabled() {
        require(enabled, "The contract is disabled.");
        _;
    }

    // Create a new sponsor position
    function sponsor(address _talent, uint256 _amount, address _token) public onlyWhileEnabled {
        require(IERC20(_token).balanceOf(msg.sender) >= _amount, "You don't have enough balance");
        require(
            IERC20(_token).allowance(msg.sender, address(this)) >= _amount,
            "You must first approve this smart contract to transfer"
        );

        // setup the internal state
        totalSponsorships = totalSponsorships + 1;
        amountAvailableForTalent[_talent][_token] = amountAvailableForTalent[_talent][_token] + _amount;
        sponsorships[msg.sender][_talent][_token] = sponsorships[msg.sender][_talent][_token] + _amount;
        amountAvailableForSponsorship[msg.sender][_talent][_token] =
            amountAvailableForSponsorship[msg.sender][_talent][_token] +
            _amount;

        // transfer from sender => contract
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        // emit event
        string memory symbol = IERC20Metadata(_token).symbol();
        emit SponsorshipCreated(msg.sender, _talent, _amount, _token, symbol);
    }

    // Withdraw all funds for a given token
    function withdrawToken(address _sponsor, address _token) public {
        require(
            amountAvailableForSponsorship[_sponsor][msg.sender][_token] > 0,
            "There are no funds for you to retrieve"
        );

        // setup the internal state
        uint256 amount = amountAvailableForSponsorship[_sponsor][msg.sender][_token];
        require(IERC20(_token).balanceOf(address(this)) >= amount, "Smart contract does not have enough funds");

        totalClaimedSponsorships = totalClaimedSponsorships + 1;
        amountAvailableForSponsorship[_sponsor][msg.sender][_token] =
            amountAvailableForSponsorship[_sponsor][msg.sender][_token] -
            amount;
        amountAvailableForTalent[msg.sender][_token] = amountAvailableForTalent[msg.sender][_token] - amount;

        // transfer from contract => sender
        IERC20(_token).transfer(msg.sender, amount);

        // emit event
        string memory symbol = IERC20Metadata(_token).symbol();
        emit Withdraw(_sponsor, msg.sender, amount, _token, symbol);
    }

    // Revokes a sponsor position
    function revokeSponsor(address _talent, address _token) public {
        uint256 amount = amountAvailableForSponsorship[msg.sender][_talent][_token];

        require(amount > 0, "There's no pending sponsorship to revoke");
        require(IERC20(_token).balanceOf(address(this)) >= amount, "The contract don't have enough balance");

        // setup the internal state
        totalRevokedSponsorships = totalRevokedSponsorships + 1;
        amountAvailableForTalent[_talent][_token] = amountAvailableForTalent[_talent][_token] - amount;
        amountAvailableForSponsorship[msg.sender][_talent][_token] =
            amountAvailableForSponsorship[msg.sender][_talent][_token] -
            amount;

        // transfer from contract => sender
        IERC20(_token).transfer(msg.sender, amount);

        // emit event
        string memory symbol = IERC20Metadata(_token).symbol();
        emit SponsorshipRevoked(msg.sender, _talent, amount, _token, symbol);
    }

    function amountAvailable(address _token) public view returns (uint256) {
        return amountAvailableForTalent[msg.sender][_token];
    }

    // Admin

    /**
     * @notice Disables the contract, disabling future sponsorships.
     * @dev Can only be called by the owner.
     */
    function disable() public onlyWhileEnabled onlyOwner {
        enabled = false;
    }

    /**
     * @notice Enables the contract, enabling new sponsors.
     * @dev Can only be called by the owner.
     */
    function enable() public onlyOwner {
        enabled = true;
    }
}
