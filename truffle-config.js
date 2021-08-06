require('babel-register');
require('babel-polyfill');

var HDWalletProvider = require("truffle-hdwallet-provider");
const MNEMONIC = 'enough 123';


const ContractKit = require('@celo/contractkit');
const Web3 =  require('web3');

const web3 = new Web3("https://celo-alfajores--rpc.datahub.figment.io/apikey/12ea3bba4594c05c72bbf59ca58d9223/");

const client = ContractKit.newKitFromWeb3(web3);

const account = web3.eth.accounts.privateKeyToAccount("b9cd47d4af2e6d12db1d4d5e6ddf95bc604d3d86b70ab6d0c4eb6d22c4b16304");

client.addAccount(account.privateKey);


module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      gas: 6721975,
      gasPrice: 20000000000,
      network_id: "*" // Match any network id
    },
    alfajores: {
      provider: client.connection.web3.currentProvider, // CeloProvider
      network_id: 44787  // latest Alfajores network id
    },
    ropsten: {
      networkCheckTimeout: 1000000,
      provider: function() {
        return new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/e91c45f37e5b4b968f0d3212865358ec")
      },
      network_id: 3,
      gas: 4000000      //make sure this gas allocation isn't over 4M, which is the max
    },
    kovan: {
      networkCheckTimeout: 1000000,
      provider: () => {
         return new HDWalletProvider(MNEMONIC,`wss://kovan.infura.io/ws/v3/e91c45f37e5b4b968f0d3212865358ec`)
      },
      network_id: "42",
   },
  },
  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/abis/',
  compilers: {
    solc: {
      version: "0.4.25",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}
