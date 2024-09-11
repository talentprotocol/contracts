// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import { AttestationRequest, AttestationRequestData, IEAS, Attestation, MultiAttestationRequest, MultiRevocationRequest } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

contract PassportAttester is Ownable{
  IEAS eas;

  mapping(address => bool) public allowedAttesters;

  constructor() Ownable(msg.sender) {}

  function setEASContractAddress(address _easContractAddress) public onlyOwner {
    eas = IEAS(_easContractAddress);
  }

  function addAttester(address attester) public onlyOwner {
    allowedAttesters[attester] = true;
  }

  function removeAttester(address attester) public onlyOwner {
    allowedAttesters[attester] = false;
  }

  function attest(AttestationRequest memory data) public {
    require(allowedAttesters[msg.sender], "Attester not allowed");

    eas.attest(data);
  }
}