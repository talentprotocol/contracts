const { assert } = require('chai');

const TalentProtocol = artifacts.require("TalentProtocol");
const TalentProtocolFactory = artifacts.require("TalentProtocolFactory");
const CareerCoin = artifacts.require("CareerCoin");

require('chai').use(require('chai-as-promised')).should()

function tokens(n) {
    return web3.utils.toWei(n, 'ether');
}

const DEFAULT_RESERVE_RATIO = 1000000;

contract ('TalentProtocol', (accounts) => {

    let creator = accounts[0]; 
    let investor = accounts[1];
    let talent1 = accounts[2];
    let talent2 = accounts[3];
    
    let talentProtocol, talentProtocolFactory
    let careerCoin
    let talentList

    before(async () => {
        // Load contracts
        talentProtocol =  await TalentProtocol.new("Talent Protocol", "TAL", 18, web3.utils.toWei("1000"))
        
        talentProtocolFactory =  await TalentProtocolFactory.new(talentProtocol.address)

        await talentProtocol.transfer(investor, web3.utils.toWei("10", "ether"))
    })

    describe('Talent Protocol Deployment', async => {
        it ('Has a name', async () => {
            const name = await talentProtocol.name();
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
                await talentProtocolFactory.instanceNewTalent('J', 'John Doe', DEFAULT_RESERVE_RATIO, talent1, 7);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent (Force test fail for Name)', async () => {
            
            try {
                await talentProtocolFactory.instanceNewTalent('JDOE', '', DEFAULT_RESERVE_RATIO, talent1, 5);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent (Force test fail for Talent address empty)', async () => {
            
            try {
                await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', DEFAULT_RESERVE_RATIO, "", 3);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent (Force test fail for Talent fee zero or negative)', async () => {
            
            try {
                await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', DEFAULT_RESERVE_RATIO, talent1, 0);
            } 
            catch (error) 
            {
            }

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)
        })

        it ('Add new talent #1', async () => {
            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 0)

            await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', DEFAULT_RESERVE_RATIO, talent1, 5);

            talentList = await talentProtocolFactory.getTalentList();
            assert.equal(talentList.length, 1)
        })

        it ('Add new talent #2', async () => {
            await talentProtocolFactory.instanceNewTalent('MDOE', 'Mary Doe', DEFAULT_RESERVE_RATIO, talent2, 5);

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

        it("Can mint tokens with ether following the bounding curve", async function() {
            let allCoins = await talentProtocolFactory.getTalentList()

            // generate JDOE token coin if necessary
            if (allCoins.length < 1) {
                await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', DEFAULT_RESERVE_RATIO, talent1, 5);
                allCoins = await talentProtocolFactory.getTalentList();
            }

            const coin = await CareerCoin.at(allCoins[0])

            // Add reserve if empty
            if(web3.utils.fromWei(await coin.reserveBalance()) == "0") {
                await coin.initialMint(web3.utils.toWei("10", 'ether'));
            }

            // first investor buys 10 more ether
            const depositAmount = web3.utils.toWei((10).toString(), 'ether');
            await coin.mint({ from: investor, value: depositAmount});

            const amount = web3.utils.fromWei(await coin.balanceOf(investor))
            assert.equal(amount, "10")

            const reserve = web3.utils.fromWei(await coin.reserveBalance())
            assert.equal(reserve, "20")

            await coin.mint({ from: investor, value: depositAmount});
            await coin.mint({ from: investor, value: depositAmount});
            await coin.mint({ from: investor, value: depositAmount});
            await coin.mint({ from: investor, value: depositAmount});
            await coin.mint({ from: investor, value: depositAmount});
            await coin.mint({ from: investor, value: depositAmount});
            await coin.mint({ from: investor, value: depositAmount});
            await coin.mint({ from: investor, value: depositAmount});

            const reserveAfterMultipleTransactions = web3.utils.fromWei(await coin.reserveBalance())
            assert.equal(reserveAfterMultipleTransactions, "100")

            const balanceOfInvestorAfterMultipleTransactions = web3.utils.fromWei(await coin.balanceOf(investor))
            assert.equal(balanceOfInvestorAfterMultipleTransactions, "90")
        })

        it("Can burn minted tokens for ether", async function() {
            let allCoins = await talentProtocolFactory.getTalentList()

            // generate JDOE token coin if necessary
            if (allCoins.length < 1) {
                await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', DEFAULT_RESERVE_RATIO, talent1, 5);
                allCoins = await talentProtocolFactory.getTalentList();
            }

            const coin = await CareerCoin.at(allCoins[0])

            // Add reserve if empty
            if(web3.utils.fromWei(await coin.reserveBalance()) == "0") {
                await coin.initialMint(web3.utils.toWei("10", 'ether'));
            }

            // Add funds to investor if needed
            if(web3.utils.fromWei(await coin.balanceOf(investor)) == "0") {
                const depositAmount = web3.utils.toWei("10", 'ether');
                await coin.mint({ from: investor, value: depositAmount});
            }

            const allInvestorBalance = await coin.balanceOf(investor)

            const beforeBurnReserve = await coin.reserveBalance()

            await coin.burn(allInvestorBalance, { from: investor });

            const reserveAfterBurn = web3.utils.fromWei(await coin.reserveBalance())
            const expectedReserveAfterBurn = web3.utils.fromWei(web3.utils.toBN(beforeBurnReserve).sub(web3.utils.toBN(allInvestorBalance)).toString())
            assert.equal(reserveAfterBurn, expectedReserveAfterBurn)

            const balanceOfInvestorAfterBurn = web3.utils.fromWei(await coin.balanceOf(investor))
            assert.equal(balanceOfInvestorAfterBurn, "0")
        })

        it("Mint & Burn Career coins with TAL", async function() {

            let allCoins = await talentProtocolFactory.getTalentList()

            // generate JDOE token coin if necessary
            if (allCoins.length < 1) {
                await talentProtocolFactory.instanceNewTalent('JDOE', 'John Doe', DEFAULT_RESERVE_RATIO, talent1, 5);
                allCoins = await talentProtocolFactory.getTalentList();
            }

            const coin = await CareerCoin.at(allCoins[0])
            
            // Add reserve if empty
            if(web3.utils.fromWei(await coin.reserveBalance()) == "0") {
                await coin.initialMint(web3.utils.toWei("10", 'ether'));
            }

            let balanceOfTal = web3.utils.fromWei(await talentProtocol.balanceOf(investor), 'ether')
            if (balanceOfTal < 5) {
                await talentProtocol.transfer(investor, web3.utils.toWei("10", "ether"))
                balanceOfTal = web3.utils.fromWei(await talentProtocol.balanceOf(investor), 'ether')
            }

            const amount = web3.utils.toWei("5", "ether");

            await talentProtocol.approve(coin.address, amount, { from: investor });

            await coin.tMint(talentProtocol.address, { from: investor, value: amount});

            const balanceOfTalAfterMint = web3.utils.fromWei(await talentProtocol.balanceOf(investor), 'ether');
            assert.equal(balanceOfTalAfterMint, balanceOfTal - 5);

            const balanceAfterMint = web3.utils.fromWei(await coin.balanceOf(investor))
            assert.equal(balanceAfterMint, 5)

            const talBalanceOfCoin = web3.utils.fromWei(await talentProtocol.balanceOf(coin.address))
            assert.equal(talBalanceOfCoin, 5)

            await coin.tBurn(talentProtocol.address, { from: investor, value: amount});

            const balanceOfTalAfterBurn = web3.utils.fromWei(await talentProtocol.balanceOf(investor), 'ether');
            assert.equal(balanceOfTalAfterBurn, balanceOfTal);

            const balanceAfterBurn = web3.utils.fromWei(await coin.balanceOf(investor))
            assert.equal(balanceAfterBurn, 0)

            const talBalanceOfCoinAfterBurn = web3.utils.fromWei(await talentProtocol.balanceOf(coin.address))
            assert.equal(talBalanceOfCoinAfterBurn, 0)
        })
    })
})
