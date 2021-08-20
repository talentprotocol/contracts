const TalentProtocol = artifacts.require("TalentProtocol");
const CareerCoin = artifacts.require("CareerCoin");
const TalentProtocolFactory = artifacts.require("TalentProtocolFactory");

module.exports = async function(deployer, network, accounts) {

  let creator = accounts[0]; 
  let investor = accounts[1];
  let talent1 = accounts[2];
  let talent2 = accounts[3];

  // Deploy Talent Protocol Token
  await deployer.deploy(TalentProtocol, "Talent Protocol", "TAL", 2, 100000000000)
  const talentProtocol = await TalentProtocol.deployed()


  // Deploy Talent Protocol Factory
  await deployer.deploy(TalentProtocolFactory, talentProtocol.address)
  const talentProtocolFactory = await TalentProtocolFactory.deployed()

  // Instanciate 2 new talent JDOE and MDOE
  // await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', 1, talent1, 5)
  // await talentProtocolFactory.instanceNewTalent('MDOE', 'Mary Doe', 1, talent2, 5)

  await talentProtocol.transfer(investor, 1000)
  await talentProtocol.transfer(talent1, 1000)

};
