import chai from "chai";
import { ethers, waffle } from "hardhat";

const { expect } = chai;
const { deployContract } = waffle;

import { InterfaceIDs } from "../../typechain/InterfaceIDs";
import InterfaceIDsArtifact from "../../artifacts/contracts/test/InterfaceIDs.sol/InterfaceIDs.json";

export function behavesAsERC165(builder: () => Promise<any>): void {
  describe("ERC165 behaviour", () => {
    let contract: any;

    beforeEach(async () => {
      contract = await builder();
    });

    it("implements supportsInterface(bytes4)", async () => {
      expect(await contract.supportsInterface(0x01ffc9a7)).to.be.true;
      expect(await contract.supportsInterface(0xffffffff)).to.be.false;
    });
  });
}

export function supportsInterfaces(builder: () => Promise<any>, interfaces: string[]): void {
  describe(`interfaces`, () => {
    let contract: any;
    let interfaceIDs: InterfaceIDs;

    beforeEach(async () => {
      const signers = await ethers.getSigners();
      const owner = signers[0];

      contract = await builder();
      interfaceIDs = (await deployContract(owner, InterfaceIDsArtifact, [])) as InterfaceIDs;
    });

    interfaces.map((interf) => {
      it(`supports interface ${interf}`, async () => {
        let id;

        switch (interf) {
          case "ERC20":
            id = await interfaceIDs.erc20();
            break;
          case "ERC165":
            id = await interfaceIDs.erc165();
            break;
        }

        expect(await contract.supportsInterface(id)).to.be.true;
      });
    });
  });
}
