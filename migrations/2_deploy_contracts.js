const TalentProtocol = artifacts.require("TalentProtocol");
const CareerCoin = artifacts.require("CareerCoin");
const TalentProtocolFactory = artifacts.require("TalentProtocolFactory");


module.exports = async function(deployer, network, accounts) {

  let creator = accounts[0]; 
  let investor = accounts[1];
  let talent1 = accounts[2];
  let talent2 = accounts[3];

  // Deplot Talent Protocol Token
  await deployer.deploy(TalentProtocol, "Talent Protocol", "TAL", 18, 100000000)
  const talentProtocol = await TalentProtocol.deployed()

  // Deploy Talent Protocol Factory
  await deployer.deploy(TalentProtocolFactory, talentProtocol.address)
  const talentProtocolFactory = await TalentProtocolFactory.deployed()

  await talentProtocolFactory.createNewTalent('JDOE', 'John Doe', '100000', 200000, talent1, 5);
  await talentProtocolFactory.createNewTalent('MDOE', 'Mary Doe', '100000', 200000, talent2, 5);

  // Send 5000 TAL tokens to investor
  
  await talentProtocol.transfer(investor, 10000)
  await talentProtocol.transfer(talent1, 10000)
  await talentProtocol.transfer(talent2, 10000)
};
