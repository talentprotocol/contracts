pragma solidity ^0.8.7;

import "@ensdomains/ens-contracts/contracts/dnsregistrar/DNSRegistrar.sol";

// import "@ensdomains/ens-contracts/contracts/dnssec-oracle/DNSSEC.sol";
// import "@ensdomains/ens-contracts/contracts/dnsregistrar/PublicSuffixList.sol";
// import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";

contract TestDNSRegistrar is DNSRegistrar {
    constructor(DNSSEC _dnssec, PublicSuffixList _suffixes, ENS _ens) DNSRegistrar(_dnssec, _suffixes, _ens) { }
}
