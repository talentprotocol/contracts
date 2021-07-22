pragma solidity 0.4.25;

import "./TalentProtocol.sol";
import "./CareerCoin.sol";

// Talent Protocol Factory
contract TalentProtocolFactory {
    string public name = "Talent Protocol Factory";
    address internal owner;

    TalentProtocol internal talentProtocol;

    CareerCoin[] internal talentList;
    event TalentAdded(address contractAddress);
    
    constructor (TalentProtocol _talentProtocol) public {
        owner = msg.sender;
        talentProtocol = _talentProtocol;
    }

    // CREATE NEW TALENT
    function createNewTalent(string _symbol, string _name, uint _initialSupply, uint32 _reserveRatio, address _talentAddress, uint256 _talentFee) public returns (bool) {
        require(msg.sender == owner, "Caller must be the owner");
        require(bytes(_symbol).length >= 3 && bytes(_symbol).length <= 8, "Symbol must be between 3 and 8 chars");
        require(bytes(_name).length >= 1, "Name must be at least 1 char");

        CareerCoin tCareerCoin = new CareerCoin(_symbol, _name, _initialSupply, _reserveRatio, _talentAddress, _talentFee);
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
