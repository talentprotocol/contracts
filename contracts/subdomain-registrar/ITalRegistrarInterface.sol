pragma solidity ^0.8.7;

import {DNSSEC} from '@ensdomains/ens-contracts/contracts/dnssec-oracle/DNSSEC.sol';

/**
 * @title ITalRegistrarInterface interface
 * @notice A registrar that allows registrations in the Talent Protocol community.
 *         The registrar holds an ENS subdomain of the convential DNS system, e.g. 'tal.community'.
 *
 *         A registration allocates one ENS subdomain of the root subdomain, e.g. 'myname.tal.community' to an address.
 *
 *         The registrations from the public `register` method can be restricted by the owner of the contract.
 */
interface ITalRegistrarInterface {
    /**
    * @dev Emitted when a new subdomain is registered.
    */
    event SubDomainRegistered(
        uint256 indexed id,
        string label,
        uint price,
        address indexed owner
    );

    /**
    * @dev Emitted when the root domain ownership is transferred to a new address.
    */
    event DomainOwnershipTransferred(address indexed owner);

    /**
    * @dev Emitted when the subdomain fee is changed.
    */
    event SubDomainFeeChanged(uint newFee);
    
    /**
    * @notice Transfer the root domain ownership of the TAL Subdomain Registrar to a new owner.
    *
    * Emits a {DomainOwnershipTransfered} event.
    */
    function transferDomainOwnership(address newDomainOwner) external;

    /**
    * @notice Returns the address that owns the subdomain.
    * @dev Can only be called if and only if the subdomain of the root node is free
    * @param subdomainLabel The subdomain label to get the owner.
    */
    function subDomainOwner(string memory subdomainLabel) external view returns (address owner);

    /**
    * @notice Register a name.
    * @param subdomainLabel The subdomain label to register.
    *
    * Emits a {SubDomainRegistered} event.
    */
    function register(string calldata subdomainLabel) external payable;

    /**
    * @notice Sets the price to pay for upcoming subdomain registrations.
    */
    function setSubdomainFee(uint subdomainFee) external;

    /**
    * @notice Stops subdomain registrations.
    */
    function stop() external;

    /**
    * @notice Opens  subdomain registration.
    */
    function open() external;

    /**
    * @notice Submits ownership proof to the DNS registrar contract.
    *
    */
    function configureDnsOwnership(
        bytes memory name,
        DNSSEC.RRSetWithSignature[] memory input,
        bytes memory proof
    ) external;
}
