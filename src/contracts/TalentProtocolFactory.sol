pragma solidity 0.4.25;

import "./TalentProtocol.sol";
import "./CareerCoin.sol";

// Talent Protocol Factory / Side chain
contract TalentProtocolFactory {

    string public name = "Talent Protocol Factory";
    TalentProtocol talentProtocol;

    CareerCoin[] public talentList;
    event TalentAdded(address contractAddress);
    
    constructor (TalentProtocol _talentProtocol) public {
        talentProtocol = _talentProtocol;
    }

    // ADD NEW TALENT
    function addTalent(
        string _name,
        string _symbol,
        uint8 _decimals,
        uint _initialSupply,
        uint32 _reserveRatio,
        address _talentAddress,
        uint256 _talentFee
    ) public returns (bool) {
        
        CareerCoin talent = new CareerCoin(_name, _symbol, _decimals, _initialSupply, _reserveRatio, _talentAddress, _talentFee);
        talentList.push(talent);

        // emit event when talent contract is created 
        emit TalentAdded(address(talent));
        return true;
    }

    // GET TALENT LIST
    function getTalentList() external view returns (CareerCoin[] memory)
    {
        return talentList;
    }
 }
