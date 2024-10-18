// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PassportRegistry.sol";

contract PassportWalletRegistry is Ownable, Pausable {
    // wallet => passport id
    mapping(address => uint256) private _addressPassportId;

    PassportRegistry public passportRegistry;

    // A new wallet passportId relation is created
    event WalletAdded(address indexed wallet, uint256 passportId);

    // A wallet passportId relation is removed
    event WalletRemoved(address indexed wallet, uint256 passportId);

    constructor(address initialOwner, address passportRegistryAddress) Ownable(initialOwner) {
        passportRegistry = PassportRegistry(passportRegistryAddress);
    }

    /**
     * @notice Gets the passportID associated with a wallet.
     * @param wallet The wallet to get the passportID for.
     * @return The passportId of the given wallet.
     */
    function getScore(address wallet) public view returns (uint256) {
        uint256 _passportId = _addressPassportId[wallet];

        return _passportId != 0 ? _addressPassportId[wallet] : passportRegistry.passportId(wallet);
    }

    /**
     * @notice Creates a new passport with the next sequential ID.
     * @dev Can only be called when the contract is not paused and by the owner.
     * @param wallet The wallet address to associate.
     * @param passportId The passportId to associate.
     */
    function addWallet(address wallet, uint256 passportId) public whenNotPaused {
        require(_addressPassportId[wallet] == 0, "Passport already exists");
        require(passportRegistry.idPassport(passportId) != address(0), "Passport ID does not exist");
        require(passportRegistry.passportId(msg.sender) == passportId, "Only the passport owner can add new wallets");

        _addressPassportId[wallet] = passportId;
        emit WalletAdded(wallet, passportId);
    }

    /**
     * @notice Creates a new passport with the next sequential ID.
     * @dev Can only be called when the contract is not paused and by the owner.
     * @param wallet The wallet address to associate.
     * @param passportId The passportId to associate.
     */
    function adminAddWallet(address wallet, uint256 passportId) public whenNotPaused onlyOwner {
        require(_addressPassportId[wallet] == 0, "Passport already exists");
        require(passportRegistry.idPassport(passportId) != address(0), "Passport ID does not exist");

        _addressPassportId[wallet] = passportId;
        emit WalletAdded(wallet, passportId);
    }

    /**
     * @notice Removes a wallet.
     * @dev Can only be called when the contract is not paused.
     */
    function removeWallet() public whenNotPaused {
        uint256 _passportId = _addressPassportId[msg.sender];
        require(_passportId != 0, "Passport does not exist");
        require(passportRegistry.idPassport(_passportId) != address(0), "Passport ID is not registered");

        _addressPassportId[msg.sender] = 0;
        emit WalletRemoved(msg.sender, _passportId);
    }

    /**
     * @notice Removes a wallet.
     * @dev Can only be called when the contract is not paused.
     */
    function adminRemoveWallet(address wallet) public whenNotPaused onlyOwner {
        uint256 _passportId = _addressPassportId[wallet];
        require(_passportId != 0, "Passport does not exist");
        require(passportRegistry.idPassport(_passportId) != address(0), "Passport ID is not registered");

        _addressPassportId[wallet] = 0;
        emit WalletRemoved(wallet, _passportId);
    }
}
