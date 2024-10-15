// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Import OpenZeppelin contracts
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract TalentProtocolToken is ERC20, ERC20Burnable, Pausable, Ownable {
  // Mint 1B tokens to the initial owner and pause the contract
  constructor(address initialOwner)
    ERC20("TalentProtocolToken", "TALENT")
    Ownable(initialOwner)
  {
    _mint(initialOwner, 600_000_000 ether);
    _pause();
  }

  function _update(address from, address to, uint256 value) internal override(ERC20) {
    require(to != address(this), "TalentProtocolToken: cannot transfer tokens to self");
    require(!paused() || owner() == _msgSender(), "Token transfer is not enabled while paused");
    super._update(from, to, value);
  }

  // Function to pause token transfers
  function pause() external onlyOwner {
    require(!paused(), "Token is already paused");
    _pause();
  }

  // Function to unpause token transfers
  function unpause() external onlyOwner {
    require(paused(), "Token is not paused");
    _unpause();
  }
}
