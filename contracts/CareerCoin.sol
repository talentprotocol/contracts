pragma solidity 0.8.7;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./curves/BancorBondingCurve.sol";
import "./TalentProtocol.sol";


contract CareerCoin is BancorBondingCurve, ERC20 {
    uint256 internal reserve;

    address public talentAddress;
    uint256 public talentFee;

    address private owner;
    TalentProtocol internal talentProtocol;

    constructor(
        string memory _symbol,
        string memory _name,
        uint32 _reserveRatio,
        address _talentAddress,
        uint256 _talentFee,
        address _owner,
        TalentProtocol _talentProtocol
    ) BancorBondingCurve(_reserveRatio) ERC20(_name, _symbol) {
        talentAddress = _talentAddress;
        talentFee = _talentFee;
        owner = _owner;
        talentProtocol = _talentProtocol;
    }

    function initialMint(uint256 amount) public payable {
        require(reserve == 0, "The reserve must be empty for the initial mint.");

        reserve += amount;
        return _mint(owner, amount);
    }

    function mintFromTal(uint256 amount) public payable {
        require(amount > 0, "Desired amount must be greater than 0.");

        uint tokenAllowance = talentProtocol.allowance(msg.sender, address(this));

        require(tokenAllowance >= amount);

        talentProtocol.transferFrom(msg.sender, address(this), amount);

        _continuousMint(amount);
    }

    function mint() public payable {
        require(msg.value > 0, "Must send ether to buy tokens.");
        _continuousMint(msg.value);
    }

    function burnToTal(uint256 amount) public payable {
        require(amount > 0, "Must send ether to buy token.");

        uint256 returnAmount = _continuousBurn(amount);

        talentProtocol.transfer(msg.sender, returnAmount);
    }

    function burn(uint256 _amount) public {
        uint256 returnAmount = _continuousBurn(_amount);
        payable(msg.sender).transfer(returnAmount);
    }

    function reserveBalance() public view override returns (uint) {
        return reserve;
    }

    function calculateReward(uint256 _amount) public view returns (uint256) {
        return getContinuousMintReward(_amount);
    }

    function calculateRefund(uint256 _amount) public view returns (uint256) {
        return getContinuousBurnRefund(_amount);
    }

    function _continuousMint(uint256 _deposit) internal returns (uint256) {
        require(_deposit > 0, "Deposit must be non-zero.");

        uint256 amount = getContinuousMintReward(_deposit);
        _mint(msg.sender, amount);
        reserve += _deposit;

        return amount;
    }

    function _continuousBurn(uint256 _amount) internal returns (uint256) {
        require(_amount > 0, "Amount must be non-zero.");
        require(balanceOf(msg.sender) >= _amount, "Insufficient tokens to burn.");

        uint256 reimburseAmount = getContinuousBurnRefund(_amount);
        reserve -= reimburseAmount;
        _burn(msg.sender, _amount);

        return reimburseAmount;
    }

    function continuousSupply() public view override returns (uint) {
        return totalSupply();
    }

    fallback() external { revert("Cannot call fallback function."); }
}
