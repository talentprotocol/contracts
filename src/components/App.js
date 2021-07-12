import React, { Component } from 'react'
import Web3 from 'web3'
import TalentProtocol from '../abis/TalentProtocol.json'
import TalentProtocolFactory from '../abis/TalentProtocolFactory.json'
import CareerCoin from '../abis/CareerCoin.json'

import Navbar from './Navbar'
import './App.css'


class App extends Component {


  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadBlockchainData() {
    const web3 = window.web3

    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })

    const networkId = await web3.eth.net.getId()

    let _talentList

    // Load Talent Protocol
    const _talentProtocolTokenData = TalentProtocol.networks[networkId]
    if(_talentProtocolTokenData) {
      const _talentProtocolToken = new web3.eth.Contract(TalentProtocol.abi, _talentProtocolTokenData.address)
      this.setState({ talentProtocol: _talentProtocolToken  })
      let _talentProtocolTokenBalance = await _talentProtocolToken.methods.balanceOf(this.state.account).call()
      this.setState({ talentProtocolBalance: _talentProtocolTokenBalance.toString() })
    } else {
      window.alert('Talent Protocol contract not deployed to detected network.')
    }

    // Load Talent Protocol Factory
    const _talentProtocolFactoryData = TalentProtocolFactory.networks[networkId]
    if(_talentProtocolFactoryData) {
      const _talentProtocolFactory = new web3.eth.Contract(TalentProtocolFactory.abi, _talentProtocolFactoryData.address)
      this.setState({ talentProtocolFactory: _talentProtocolFactory  })

      //list talent
       _talentList = await _talentProtocolFactory.methods.getTalentList().call()
      
      this.setState({ talentList: _talentList  })

      this.setState({ name: 'teste' })

    } else {
      window.alert('Talent Protocol Factory ontract not deployed to detected network.')
    } 

    const _talentListItemsNames = [], _talentListItemsSymbols = [], _talentListItemsMintedCoins = []

    for (let index = 0; index < _talentList.length; index++) {
      const _careerCoin = new web3.eth.Contract(CareerCoin.abi, _talentList[index])
      const _name = await _careerCoin.methods.name().call()
      const _symbol = await _careerCoin.methods.symbol().call()
      const _mintedCoins = await _careerCoin.methods.continuousSupply().call()

      _talentListItemsNames.push(_name)
      _talentListItemsSymbols.push(_symbol)
      _talentListItemsMintedCoins.push(_mintedCoins)
    }
    
    this.setState({ talentListItemsNames: _talentListItemsNames })
    this.setState({ talentListItemsSymbols: _talentListItemsSymbols })
    this.setState({ talentListItemsMintedCoins: _talentListItemsMintedCoins })


    this.setState({ loading: false })
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }


  constructor(props) {
    super(props)
    this.state = {
      account: '0x0',
      talentProtocol: {},
      talentProtocolBalance: '0',
      talentProtocolFactory: {},
      talentList: [],
      talentListItemsNames: [],
      talentListItemsSymbols: [],
      talentListItemsMintedCoins: [],
      loading: true
    }
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        <div className="container-fluid mt-5 ml-5">
          <div className="row">
            
            <p><b>BALANCE:</b> {window.web3.utils.fromWei(this.state.talentProtocolBalance, 'Ether')} TAL</p>

          </div>

          <div className="row">
            <p><b>TALENT LIST ON TALENT PROTOCOL FACTORY SMART CONTRACT (Career coins)</b></p>
          </div>


        {this.state.talentList.map((talent, index) => (
                <div className="row"> {talent}  |  {this.state.talentListItemsNames[index] }  |  {this.state.talentListItemsSymbols[index] }   |  {this.state.talentListItemsMintedCoins[index] } coins </div>
        ))}
          



        </div>
      </div>
    );
  }
}

export default App;
