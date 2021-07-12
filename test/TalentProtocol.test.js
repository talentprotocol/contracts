const TalentProtocol = artifacts.require("TalentProtocol");
const TalentProtocolFactory = artifacts.require("TalentProtocolFactory");
const CareerCoin = artifacts.require("CareerCoin");

require('chai').use(require('chai-as-promised')).should()

function tokens(n) {
    return web3.utils.toWei(n, 'ether');
}

contract ('TalentProtocol', (accounts) => {

    let creator = accounts[0]; 
    let investor = accounts[1];
    let talent1 = accounts[2];
    let talent2 = accounts[2];
    
    let talentProcotol, talentProtocolFactory
    let careerCoin
    let talentList

    before(async () => {
        // Load contracts
        talentProcotol =  await TalentProtocol.new("Talent Protocol", "TAL", 18, 100000000)
        talentProtocolFactory =  await TalentProtocolFactory.new(talentProcotol.address)
    })

    describe('Talent Protocol Deployment', async => {
        it ('Has a name', async () => {
            const name = await talentProcotol.name();
            assert.equal(name, 'Talent Protocol')
        })

    })

    describe('Talent Protocol Factory Deployment', async => {
        it ('Has a name', async () => {
            const name = await talentProtocolFactory.name();
            assert.equal(name, 'Talent Protocol Factory')
        })

        it ('Add talent #1', async () => {
            await talentProtocolFactory.addTalent('JDOE', 'John Doe', 18, '100000', 200000, talent1, 5);

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 1)
        })

        it ('Add talent #2', async () => {
            await talentProtocolFactory.addTalent('MDOE', 'Mary Doe', 18, '100000', 200000, talent2, 5);

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 2)
        })

        it ('List talent data', async () => {
            talentList = await talentProtocolFactory.getTalentList();

            for (var i=0; i<talentList.length; i++) {
                console.log( talentList[i]);
            }

        })

        it ('Validade first element #1', async () => {

            // get first talent
            careerCoin = await CareerCoin.at(talentList[0])
        })

        it ('Has correct talent #1 name', async () => {

            const name = await careerCoin.name();
            assert.equal(name, 'John Doe')
        })

        it ('Has correct talent #1 symbol', async () => {

            const symbol = await careerCoin.symbol();
            assert.equal(symbol, 'JDOE')
        })
    })
})