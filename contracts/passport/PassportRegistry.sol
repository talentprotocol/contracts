// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PassportRegistry is Ownable, Pausable {
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
    uint256 public totalCreates;

    // Total number of passports sequencially created
    uint256 public totalSequencialCreates;

    // Total number of passports created by admins
    uint256 public totalAdminsCreates;

    // Total number of passport transfers
    uint256 public totalPassportTransfers;

    // The next id to be issued
    uint256 private _nextSequencialPassportId;

    // Smart contract id in sequencial mode
    bool private _sequencial;

    // A new passport has been created
    event Create(address indexed wallet, uint256 passportId, string source);

    // A passport has been tranfered
    event Transfer(uint256 oldPassportId, uint256 newPassportId, address indexed oldWallet, address indexed newWallet);

    // A passport has been deactivated
    event Deactivate(address indexed wallet, uint256 passportId);

    // A passport has been activated
    event Activate(address indexed wallet, uint256 passportId);

    // Passport generation mode changed
    event PassportGenerationChanged(bool sequencial, uint256 nextSequencialPassportId);

    /**
     * @dev Modifier to make a function callable only when the contract is in sequencial mode.
     *
     * Requirements:
     *
     * - The contract must be in sequencial mode.
     */
    modifier whenSequencialGeneration() {
        require(sequencial(), "Admin generation mode");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is in admin generation mode.
     *
     * Requirements:
     *
     * - The contract must be in admin generation mode.
     */
    modifier whenAdminGeneration() {
        require(!sequencial(), "Sequencial generation mode");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        transferOwnership(initialOwner);
        _sequencial = false;
    }

    function create(string memory source) public whenNotPaused whenSequencialGeneration {
        require(passportId[msg.sender] == 0, "Passport already exists");

        totalSequencialCreates++;

        _create(msg.sender, _nextSequencialPassportId, source);
        _nextSequencialPassportId += 1;
    }

    function adminCreate(
        string memory source,
        address wallet,
        uint256 id
    ) public onlyOwner whenNotPaused whenAdminGeneration {
        require(passportId[wallet] == 0, "Passport already exists");

        totalAdminsCreates++;

        _create(wallet, id, source);
    }

    /**
     * @notice Transfer the passport id of the msg.sender to the newWallet.
     * @dev Can only be called by the passport owner.
     */
    function transfer(address newWallet) public whenNotPaused {
        uint256 id = passportId[msg.sender];
        uint256 newWalletId = passportId[newWallet];
        require(id != 0, "Passport does not exist");
        require(newWalletId == 0, "Wallet passed already has a passport");

        passportId[msg.sender] = 0;
        passportId[newWallet] = id;
        idPassport[id] = newWallet;
        walletActive[msg.sender] = false;
        walletActive[newWallet] = true;
        totalPassportTransfers++;

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

        totalPassportTransfers++;

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

    /**
     * @notice Changes the contract generation mode.
     * @dev Can only be called by the owner.
     */
    function setGenerationMode(bool sequencialFlag, uint256 nextSequencialPassportId) public onlyOwner {
        _sequencial = sequencialFlag;
        _nextSequencialPassportId = nextSequencialPassportId;

        emit PassportGenerationChanged(sequencialFlag, nextSequencialPassportId);
    }

    /**
     * @dev Returns true if the contract is in sequencial mode, and false otherwise.
     */
    function sequencial() public view virtual returns (bool) {
        return _sequencial;
    }

    /**
     * @dev Returns the next id to be generated.
     */
    function nextId() public view virtual returns (uint256) {
        return _nextSequencialPassportId;
    }

    // private

    function _create(address wallet, uint256 id, string memory source) private {
        require(idPassport[id] == address(0), "Passport id already issued");

        totalCreates++;

        idPassport[id] = wallet;
        passportId[wallet] = id;
        walletActive[wallet] = true;
        idActive[id] = true;
        idSource[id] = source;
        
        (bool success, uint256 result) = Math.tryAdd(sourcePassports[source], 1);
        require(success, "Incrementing source count failed");
        sourcePassports[source] = result;
        // emit event
        emit Create(wallet, id, source);
    }
}
