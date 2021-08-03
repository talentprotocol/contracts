require('babel-register');
require('babel-polyfill');

var HDWalletProvider = require("truffle-hdwallet-provider");
const MNEMONIC = 'enough barrel diet search auto cherry churn original sock tongue sniff garbage';

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      gas: 6721975,
      gasPrice: 20000000000,
      network_id: "*" // Match any network id
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
