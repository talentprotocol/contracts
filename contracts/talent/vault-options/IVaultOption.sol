// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IVaultOption {
  /**
   * @notice Called by the vault when user deposits TALENT to this strategy.
   * @param user The user who is depositing.
   * @param amount The amount of TALENT (in wei) being deposited.
   */
  function depositIntoVaultOption(address user, uint256 amount) external;

  /**
   * @notice Called by the vault when user withdraws from this strategy.
   * @dev Vault option should return the total principal + yield to the vault.
   * @param user The user who is withdrawing.
   * @return totalOwed The total TALENT owed to the user (principal + yield).
   */
  function withdrawFromVaultOption(address user) external returns (uint256 totalOwed);

  /**
   * @notice Preview how much TALENT (principal + yield) `user` has if they were to withdraw now.
   * @param user The user to check.
   */
  function previewRewards(address user) external view returns (uint256);
}
