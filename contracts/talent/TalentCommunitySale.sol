// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TalentCommunitySale is Ownable, ReentrancyGuard {
  using Math for uint256;

  IERC20 public paymentToken;
  address public receivingWallet;

  uint32 public constant TIER1_MAX_BUYS = 300;
  uint32 public constant TIER2_MAX_BUYS = 500;
  uint32 public constant TIER3_MAX_BUYS = 1250;
  uint32 public constant TIER4_MAX_BUYS = 500;

  uint32 public tier1Bought;
  uint32 public tier2Bought;
  uint32 public tier3Bought;
  uint32 public tier4Bought;

  event Tier1Bought(address indexed buyer, uint256 amount);
  event Tier2Bought(address indexed buyer, uint256 amount);
  event Tier3Bought(address indexed buyer, uint256 amount);
  event Tier4Bought(address indexed buyer, uint256 amount);

  mapping(address => bool) public listOfBuyers;

  constructor(
    address initialOwner,
    address _paymentToken,
    address _receivingWallet
  ) Ownable(initialOwner) {
    paymentToken = IERC20(_paymentToken);
    receivingWallet = _receivingWallet;
  }

  function buyTier1() external nonReentrant {
    require(paymentToken.allowance(msg.sender, address(this)) >= 100 ether, "TalentCommunitySale: Insufficient allowance");
    require(tier1Bought < TIER1_MAX_BUYS, "TalentCommunitySale: Tier 1 sold out");
    require(!listOfBuyers[msg.sender], "TalentCommunitySale: Address already bought");
    require(paymentToken.transferFrom(msg.sender, receivingWallet, 100 ether), "Transfer failed");

    tier1Bought++;
    listOfBuyers[msg.sender] = true;
    emit Tier1Bought(msg.sender, 100 ether);
  }

  function buyTier2() external nonReentrant {
    require(paymentToken.allowance(msg.sender, address(this)) >= 250 ether, "TalentCommunitySale: Insufficient allowance");
    require(tier2Bought < TIER2_MAX_BUYS, "TalentCommunitySale: Tier 2 sold out");
    require(!listOfBuyers[msg.sender], "TalentCommunitySale: Address already bought");
    require(paymentToken.transferFrom(msg.sender, receivingWallet, 250 ether), "Transfer failed");

    tier2Bought++;
    listOfBuyers[msg.sender] = true;
    emit Tier2Bought(msg.sender, 250 ether);
  }

  function buyTier3() external nonReentrant {
    require(paymentToken.allowance(msg.sender, address(this)) >= 500 ether, "TalentCommunitySale: Insufficient allowance");
    require(tier3Bought < TIER3_MAX_BUYS, "TalentCommunitySale: Tier 3 sold out");
    require(!listOfBuyers[msg.sender], "TalentCommunitySale: Address already bought");
    require(paymentToken.transferFrom(msg.sender, receivingWallet, 500 ether), "Transfer failed");

    tier3Bought++;
    listOfBuyers[msg.sender] = true;
    emit Tier3Bought(msg.sender, 500 ether);
  }

  function buyTier4() external nonReentrant {
    require(paymentToken.allowance(msg.sender, address(this)) >= 1000 ether, "TalentCommunitySale: Insufficient allowance");
    require(tier4Bought < TIER4_MAX_BUYS, "TalentCommunitySale: Tier 4 sold out");
    require(!listOfBuyers[msg.sender], "TalentCommunitySale: Address already bought");
    require(paymentToken.transferFrom(msg.sender, receivingWallet, 1000 ether), "Transfer failed");

    tier4Bought++;
    listOfBuyers[msg.sender] = true;
    emit Tier4Bought(msg.sender, 1000 ether);
  }
}
