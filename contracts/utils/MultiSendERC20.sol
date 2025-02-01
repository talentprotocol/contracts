// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MultiSendERC20 is Ownable {
  uint8 public arrayLimit;
  ERC20 public token;

  event Multisended(uint256 total, address token);

  constructor(address _owner, address _token) Ownable(_owner) {
    arrayLimit = 200;
    token = ERC20(_token);
  }

  function setArrayLimit(uint8 _arrayLimit) external onlyOwner {
    arrayLimit = _arrayLimit;
  }

  function multisendToken(address[] calldata _recipients, uint256[] calldata _amounts) public {
    uint256 total = 0;
    require(_recipients.length <= arrayLimit, "Array length exceeds limit");
    uint8 i = 0;
    for (i; i < _recipients.length; i++) {
      require(token.transferFrom(msg.sender, _recipients[i], _amounts[i]), "Transfer failed");
      total += _amounts[i];
    }

    emit Multisended(total, address(token));
  }
}
