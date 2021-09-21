// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1363Receiver} from "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";

import "hardhat/console.sol";

import {StableThenToken} from "./staking/StableThenToken.sol";
import {ITalentToken} from "./TalentToken.sol";
import {ITalentFactory} from "./TalentFactory.sol";

/// Staking contract
///
/// @notice During phase 1, accepts USDT, which is automatically converted into an equivalent TAL amount.
///   Once phase 2 starts (after a TAL address has been set), only TAL deposits are accepted
///
/// @dev Across
contract Staking is StableThenToken, IERC1363Receiver {
    /// Details of each individual stake
    struct Stake {
        address owner;
        address talent;
        uint256 protocolAmount;
        uint256 talentAmount;
    }

    /// List of all stakes
    mapping(address => Stake) public stakes;

    bytes4 constant ERC1363_RECEIVER_RET = bytes4(keccak256("onTransferReceived(address,address,uint256,bytes)"));

    /// The Talent Token Factory contract (ITalentFactory)
    address public factory;

    /// The price (in USD cents) of a single TAL token
    uint256 public protocolPrice;

    /// The price (in TAL tokens) of a single Talent Token
    uint256 public talentPrice;

    /// @param _stableCoin The USD-pegged stable-coin contract to use
    /// @param _factory ITalentFactory instance
    /// @param _protocolPrice The price of a tal token in the give stable-coin (50 means 1 TAL = 0.50USD)
    /// @param _talentPrice The price of a talent token in TAL (50 means 1 Talent Token = 50 TAL)
    constructor(
        address _stableCoin,
        address _factory,
        uint256 _protocolPrice,
        uint256 _talentPrice
    ) StableThenToken(_stableCoin) {
        require(_protocolPrice > 0, "_protocolPrice cannot be 0");
        require(_talentPrice > 0, "_talentPrice cannot be 0");

        factory = _factory;
        protocolPrice = _protocolPrice;
        talentPrice = _talentPrice;
    }

    /// Creates a new stake from an amount of stable coin.
    /// The USD amount will be converted to the equivalent amount in TAL, according to the pre-determined rate
    ///
    /// @param _amount The amount of stable coin to stake
    /// @return true if operation succeeds
    ///
    /// @notice The contract must be previously approved to spend _amount on behalf of `msg.sender`
    function stakeStable(address _talent, uint256 _amount) public stablePhaseOnly returns (bool) {
        require(stakes[msg.sender].owner == address(0x0), "address already has stake");
        require(_amount > 0, "amount cannot be zero");

        IERC20(stableCoin).transferFrom(msg.sender, address(this), _amount);

        uint256 _protocolAmount = convertUsdToProtocol(_amount);

        _createStake(msg.sender, _talent, _protocolAmount);

        return true;
    }

    /// Calculates stable coin balance of the contract
    ///
    /// @return the stable coin balance
    function stableCoinBalance() public view returns (uint256) {
        return IERC20(stableCoin).balanceOf(address(this));
    }

    /// Calculates TAL token balance of the contract
    ///
    /// @return the amount of TAL tokens
    function tokenBalance() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    //
    // Begin: IERC1363Receivber
    //

    function onTransferReceived(
        address, // _operator
        address _sender,
        uint256 _amount,
        bytes calldata data
    ) external override(IERC1363Receiver) returns (bytes4) {
        require(_isProtocolToken(msg.sender) || _isTalentToken(msg.sender), "Unrecognized ERC20 token received");

        if (_isProtocolToken(msg.sender)) {
            // if input is TAL, this is a stake since TAL deposits are enabled when
            // `setToken` is called, no additional check for `tokenPhaseOnly` is
            // necessary here
            address talent = bytesToAddress(data);

            _createStake(_sender, talent, _amount);

            return ERC1363_RECEIVER_RET;
        } else if (_isTalentToken(msg.sender)) {
            require(_isTokenSet(), "TAL token not yet set. Refund not possible");

            // if it's a registered Talent Token, this is a refund
            address talent = msg.sender;

            _withdrawStake(_sender, talent, _amount);

            return ERC1363_RECEIVER_RET;
        } else {
            revert("Unrecognized ERC1363 token received");
        }
    }

    function _isProtocolToken(address _address) internal view returns (bool) {
        return _address == token;
    }

    function _isTalentToken(address _address) internal view returns (bool) {
        return ITalentFactory(factory).isTalentToken(_address);
    }

    //
    // End: IERC1363Receivber
    //

    //
    // Private Interface
    //

    /// Creates a stake, given an owner and a TAL amount
    ///
    /// @dev This function assumes tokens have been previously transfered by
    ///   the caller function or via ERC1363Receiver
    function _createStake(
        address _owner,
        address _talent,
        uint256 _protocolAmount
    ) private {
        require(_isTalentToken(_talent), "not a valid talent token");
        require(stakes[_owner].owner == address(0x0), "address already has stake");
        require(_protocolAmount > 0, "amount cannot be zero");

        uint256 talentAmount = convertProtocolToTalent(_protocolAmount);

        ITalentToken(_talent).mint(_owner, talentAmount);

        stakes[_owner] = Stake(_owner, _talent, _protocolAmount, talentAmount);
    }

    function _withdrawStake(
        address _owner,
        address _talent,
        uint256 _talentAmount
    ) private {
        require(_isTalentToken(_talent), "not a valid talent token");

        Stake storage stake = stakes[_owner];

        require(stake.owner == _owner, "stake does not exist");
        require(stake.talentAmount == _talentAmount);

        // TODO missing rewards calculation
        require(IERC20(token).balanceOf(address(this)) >= stake.protocolAmount, "not enough TAL to fulfill request");

        ITalentToken(_talent).burn(address(this), _talentAmount);

        IERC20(token).transfer(stake.owner, stake.protocolAmount);

        // stake.finished = true;

        // TODO? do we only allow refunds for 100% of the talent tokens received?
    }

    // function _restake() {

    // }

    /// Converts a given USD amount to TAL
    ///
    /// @param _usd The amount of USD, in cents, to convert
    /// @return The converted TAL amount
    function convertUsdToProtocol(uint256 _usd) public view returns (uint256) {
        return (_usd / protocolPrice) * 1 ether;
    }

    /// Converts a given TAL amount to a Talent Token amount
    ///
    /// @param _tal The amount of TAL to convert
    /// @return The converted Talent Token amount
    function convertProtocolToTalent(uint256 _tal) public view returns (uint256) {
        return (_tal / talentPrice) * 1 ether;
    }

    /// Converts a given Talent Token amount to TAL
    ///
    /// @param _talent The amount of Talent Tokens to convert
    /// @return The converted TAL amount
    function convertTalentToProtocol(uint256 _talent) public view returns (uint256) {
        return (_talent * talentPrice) / 1 ether;
    }

    /// Converts a given USD amount to Talent token
    ///
    /// @param _usd The amount of USD, in cents, to convert
    /// @return The converted Talent token amount
    function convertUsdToTalent(uint256 _usd) public view returns (uint256) {
        return convertProtocolToTalent(convertUsdToProtocol(_usd));
    }

    /// Converts a byte sequence to address
    ///
    /// @dev This function requires the byte sequence to have 20 bytes of length
    ///
    /// @dev I didn't understand why using `calldata` instead of `memory` doesn't work,
    ///   or what would be the correct assembly to work with it.
    function bytesToAddress(bytes memory bs) private pure returns (address addr) {
        require(bs.length == 20, "invalid data length for address");

        assembly {
            addr := mload(add(bs, 20))
        }
    }
}
