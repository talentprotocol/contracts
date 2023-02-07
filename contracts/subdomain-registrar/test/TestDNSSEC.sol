pragma solidity ^0.8.7;

import {DNSSEC} from '@ensdomains/ens-contracts/contracts/dnssec-oracle/DNSSEC.sol';

contract TestDNSSEC {
    uint16 expectedType;
    bytes expectedName;
    uint32 inception;
    uint64 inserted;
    bytes20 hash;

    function setData(
        uint16 _expectedType,
        bytes memory _expectedName,
        uint32 _inception,
        uint64 _inserted,
        bytes memory _proof
    ) public {
        expectedType = _expectedType;
        expectedName = _expectedName;
        inception = _inception;
        inserted = _inserted;
        if(_proof.length != 0) {
            hash = bytes20(keccak256(_proof));
        }
    }

    function rrdata(uint16 dnstype, bytes memory name) public view returns (uint32, uint64, bytes20) {
        require(dnstype == expectedType);
        require(keccak256(name) == keccak256(expectedName));
        return (inception, inserted, hash);
    }

    function submitRRSets(
        DNSSEC.RRSetWithSignature[] memory input,
        bytes calldata _proof
    ) public pure returns (bytes memory) {
        return _proof;
    }
}
