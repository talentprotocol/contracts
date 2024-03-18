// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract PassportRegistry is Ownable, Pausable {
    using Counters for Counters.Counter;

    // wallet => passport id
    mapping(address => uint256) public passportId;

    // passport id => wallet
    mapping(uint256 => address) public idPassport;

    // wallet => bool
    mapping(address => bool) public walletActive;

    // id => bool
    mapping(uint256 => bool) public idActive;

    // id => source
    mapping(uint256 => string) public idSource;

    // source => # passports
    mapping(string => uint256) public sourcePassports;

    // Total number of passports created
    Counters.Counter public totalCreates;

    // Total number of passports publicly created
    Counters.Counter public totalPublicCreates;

    // Total number of passport transfers
    Counters.Counter public totalPassportTransfers;

    // Initial id of passport creations
    uint256 public initialPassportId = 1000;

    // A new passport has been created
    event Create(address indexed wallet, uint256 passportId, string source);

    // A passport has been tranfered
    event Transfer(uint256 oldPassportId, uint256 newPassportId, address indexed oldWallet, address indexed newWallet);

    // A passport has been deactivated
    event Deactivate(address indexed wallet, uint256 passportId);

    // A passport has been activated
    event Activate(address indexed wallet, uint256 passportId);

    constructor(address contractOwner) {
        transferOwnership(contractOwner);
    }

    function create(string memory source) public whenNotPaused {
        require(passportId[msg.sender] == 0, "Passport already exists");

        uint256 newPassportId = SafeMath.add(initialPassportId, SafeMath.add(totalPublicCreates.current(), 1));
        totalPublicCreates.increment();

        _create(msg.sender, newPassportId, source);
    }

    /**
     * @notice Transfer the passport id of the msg.sender to the newWallet.
     * @dev Can only be called by the passport owner.
     */
    function transfer(address newWallet) public whenNotPaused {
        uint256 id = passportId[msg.sender];
        require(id != 0, "Passport does not exist");

        passportId[msg.sender] = 0;
        passportId[newWallet] = id;
        idPassport[id] = newWallet;
        walletActive[msg.sender] = false;
        totalPassportTransfers.increment();

        emit Transfer(id, id, msg.sender, newWallet);
    }

    // Admin

    /**
     * @notice Change the wallet passport id to a new one.
     * @dev Can only be called by the owner.
     */
    function adminTransfer(address wallet, uint256 id) public onlyOwner {
        uint256 oldId = passportId[wallet];
        address idOwner = idPassport[id];
        require(oldId != 0, "Wallet does not have a passport to transfer from");
        require(idOwner == address(0), "New passport id already has a owner");

        string memory source = idSource[oldId];
        idSource[id] = source;
        idSource[oldId] = "";
        passportId[wallet] = id;
        idPassport[oldId] = address(0);
        walletActive[wallet] = true;
        idActive[id] = true;
        idActive[oldId] = false;

        totalPassportTransfers.increment();

        emit Transfer(oldId, id, wallet, wallet);
    }

    /**
     * @notice Activates the passport of a given walley.
     * @dev Can only be called by the owner.
     */
    function activate(address wallet) public whenNotPaused onlyOwner {
        require(passportId[wallet] != 0, "Passport must exist");
        require(walletActive[wallet] == false, "Passport must be inactive");

        uint256 id = passportId[wallet];

        walletActive[wallet] = true;
        idActive[id] = true;

        // emit event
        emit Activate(wallet, id);
    }

    /**
     * @notice Deactivates the passport of a given walley.
     * @dev Can only be called by the owner.
     */
    function deactivate(address wallet) public whenNotPaused onlyOwner {
        require(passportId[wallet] != 0, "Passport must exist");
        require(walletActive[wallet] == true, "Passport must be active");

        uint256 id = passportId[wallet];

        walletActive[wallet] = false;
        idActive[id] = false;

        // emit event
        emit Deactivate(wallet, id);
    }

    /**
     * @notice Pauses the contract, disabling future creations.
     * @dev Can only be called by the owner.
     */
    function pause() public whenNotPaused onlyOwner {
        _pause();
    }

    /**
     * @notice Enables the contract, enabling new creations.
     * @dev Can only be called by the owner.
     */
    function unpause() public whenPaused onlyOwner {
        _unpause();
    }

    // private

    function _create(address wallet, uint256 id, string memory source) private {
        totalCreates.increment();

        idPassport[id] = wallet;
        passportId[wallet] = id;
        walletActive[wallet] = true;
        idActive[id] = true;
        idSource[id] = source;
        sourcePassports[source] = SafeMath.add(sourcePassports[source], 1);
        // emit event
        emit Create(wallet, id, source);
    }
}
