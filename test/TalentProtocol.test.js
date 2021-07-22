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
    let talent2 = accounts[3];
    
    let talentProcotol, talentProtocolFactory
    let careerCoin
    let talentList

    before(async () => {
        // Load contracts
        talentProcotol =  await TalentProtocol.new("Talent Protocol", "TAL", 18, 100000000)
        talentProtocolFactory =  await TalentProtocolFactory.new(talentProcotol.address)

        // Send some $TAL to this wallets
        
        // Send 5000 TAL tokens to investor
        await talentProtocol.transfer(creator, '500000000000000000000')
        await talentProtocol.transfer(investor, '500000000000000000000')
        await talentProtocol.transfer(talent1, '500000000000000000000')
        await talentProtocol.transfer(talent2, '500000000000000000000')
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

        it ('Add new talent (Force test fail Symbol between 3 - 8 chars)', async () => {

            try {
                await talentProtocolFactory.createNewTalent('J', 'John Doe', '100000', 200000, talent1, 5);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent (Force test fail for Name)', async () => {
            
            try {
                await talentProtocolFactory.createNewTalent('JDOE', '', '100000', 200000, talent1, 5);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent #1', async () => {
            await talentProtocolFactory.createNewTalent('JDOE', 'John Doe', '100000', 200000, talent1, 5);

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 1)
        })

        it ('Add new talent #2', async () => {
            await talentProtocolFactory.createNewTalent('MDOE', 'Mary Doe', '100000', 200000, talent2, 5);

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