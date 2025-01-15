// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract TalentVaultV2 is ERC4626 {
  using SafeERC20 for IERC20;
  IERC20 public immutable token;

  constructor(ERC20 _asset)
    ERC4626(_asset)
    ERC20("Staked TALENT", "sTALENT")
  {
    token = _asset;
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
}