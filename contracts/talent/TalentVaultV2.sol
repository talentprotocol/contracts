// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "./vault-options/IVaultOption.sol";

contract TalentVaultV2 is ERC4626, Ownable {
  using SafeERC20 for IERC20;
  IERC20 public immutable token;

  // Mapping of strategy address => boolean indicating whitelist status
  // This is used to prevent users from depositing tokens from untrusted strategies
  mapping(address => bool) private _whitelistedStrategies;

  event VaultOptionAdded(address indexed vaultOption);
  event VaultOptionRemoved(address indexed vaultOption);

  constructor(ERC20 _asset)
    ERC4626(_asset)
    ERC20("Staked TALENT", "sTALENT")
    Ownable(msg.sender)
  {
    token = _asset;
  }

  /**
   * @dev Adds a new yield strategy to the whitelist.
   * Can only be called by the contract owner (admin).
   */
  function addVaultOption(address vaultOption) external onlyOwner {
    require(vaultOption != address(0), "Invalid address");
    require(!_whitelistedStrategies[vaultOption], "Already whitelisted");
    
    token.approve(vaultOption, type(uint256).max);

    _whitelistedStrategies[vaultOption] = true;
    emit VaultOptionAdded(vaultOption);
  }

  /**
   * @dev Removes a yield strategy from the whitelist.
   * Can only be called by the contract owner (admin).
   */
  function removeVaultOption(address vaultOption) external onlyOwner {
    require(_whitelistedStrategies[vaultOption], "Not whitelisted");
    
    _whitelistedStrategies[vaultOption] = false;
    
    emit VaultOptionRemoved(vaultOption);
  }

  /**
   * @dev Returns true if `vaultOption` is whitelisted.
   */
  function isWhitelisted(address vaultOption) public view returns (bool) {
      return _whitelistedStrategies[vaultOption];
  }

  // Given the 1:1 ratio, we can simply map assets to shares directly.
  function convertToShares(uint256 assets) public view virtual override returns (uint256) {
    return assets;
  }

  // Likewise, shares map back to the same number of assets.
  function convertToAssets(uint256 shares) public view virtual override returns (uint256) {
    return shares;
  }

  // Total assets is simply the balance of the token in this contract.
  function totalAssets() public view virtual override returns (uint256) {
    return token.balanceOf(address(this));
  }

  function depositToOption(
    uint256 assets,
    address receiver,
    address option
  ) external returns (uint256 shares) {
    require(_whitelistedStrategies[option], "Option not whitelisted");

    // Deposit into the Vault which
    // 1. Transfer TALENT from user -> vault
    // 2. The vault mints sTALENT for the user, 1:1
    shares = deposit(assets, receiver);
    // 3. Vault calls the option’s deposit function which transfers the TALENT to the option
    IVaultOption(option).depositIntoVaultOption(receiver, assets);
    return shares;
  }

  function withdrawFromOption(
    uint256 shares,
    address receiver,
    address owner,
    address option
  ) public returns (uint256 assets) {
    // Check that option is whitelisted
    require(_whitelistedStrategies[option], "Option not whitelisted");

    // Option calculates principal + yield and sends it to the vault
    uint256 rewardsOwed = IVaultOption(option).withdrawFromVaultOption(owner);
    // Withdraw from the Vault which
    // 1. Burns the user's shares
    // 2. Transfers TALENT from the vault -> user
    assets = withdraw(shares, receiver, owner);

    // The vault then sends rewarded TALENT to the user
    bool success = token.transfer(receiver, rewardsOwed);
    require(success, "reward transfer failed");

    return assets + rewardsOwed;
  }
}
