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
        
        //await talentProcotol.transfer(investor, tokens('1000'), {from: creator, gas: 51382 })

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
                await talentProtocolFactory.instanceNewTalent('J', 'John Doe', 1, talent1, 7);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent (Force test fail for Name)', async () => {
            
            try {
                await talentProtocolFactory.instanceNewTalent('JDOE', '', 1, talent1, 5);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent (Force test fail for Talent address empty)', async () => {
            
            try {
                await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', 1, "", 3);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent (Force test fail for Talent fee zero or negative)', async () => {
            
            try {
                await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', 1, talent1, 0);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent #1', async () => {
            await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', '100000', 200000, talent1, 5);

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 1)
        })

        it ('Add new talent #2', async () => {
            await talentProtocolFactory.instanceNewTalent('MDOE', 'Mary Doe', '100000', 200000, talent2, 5);

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
            console.log("---- VALIDATING TALENT #1 - Garantee all functions work properly ----");

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

        it ('Has correct talent #1 totalSupply == 0', async () => {

            const totalSupply = await careerCoin.totalSupply();
            expect(totalSupply.toString()).to.equal(web3.utils.toWei('0', 'ether'));
        })

        
        it("Can mint tokens with ether", async function() {

            const depositAmount = web3.utils.toWei('1', 'ether');
            const rewardAmount = await careerCoin.getContinuousMintReward(depositAmount);
            console.log(rewardAmount);
        
        
          })
        

    })
})