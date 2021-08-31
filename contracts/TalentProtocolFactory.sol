pragma solidity 0.8.7;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import "./TalentProtocol.sol";
import "./CareerCoin.sol";

// Talent Protocol Factory
contract TalentProtocolFactory is Ownable {
    string public name = "Talent Protocol Factory";

    TalentProtocol internal talentProtocol;
    CareerCoin[] internal talentList;

    event TalentAdded(address contractAddress);

    constructor (TalentProtocol _talentProtocol) Ownable() {
        talentProtocol = _talentProtocol;
    }

    modifier onlyValidInputData(
        string memory _symbol,
        string memory _name,
        address _talentAddress,
        uint256 _talentFee
    ) {
        require(bytes(_symbol).length >= 3 && bytes(_symbol).length <= 8, "Symbol must be between 3 and 8 chars");
        require(bytes(_name).length >= 1, "Name must be at least 1 char");
        require(_talentAddress != address(0x0), "Talent wallet address must be set");
        require(_talentFee > 0, "Talent fee must be more than zero");
        _;
    }

    // INSTANTIATE NEW TALENT ON FACTORY
    function instanceNewTalent(
        string memory _symbol,
        string memory _name,
        uint32 _reserveRatio,
        address _talentAddress,
        uint256 _talentFee
    ) onlyOwner onlyValidInputData(_symbol, _name, _talentAddress, _talentFee) public returns (bool) {
        CareerCoin tCareerCoin = new CareerCoin(
            _symbol,
            _name,
            _reserveRatio,
            _talentAddress,
            _talentFee,
            owner(),
            talentProtocol
        );

        talentList.push(tCareerCoin);

        // emit event when talent contract is created
        emit TalentAdded(address(tCareerCoin));

        return true;
    }

    // GET TALENT LIST
    function getTalentList() external view returns (CareerCoin[] memory)
    {
        return talentList;
    }
 }
