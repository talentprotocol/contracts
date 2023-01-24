import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import { ERC165 } from "../../shared";

import { VirtualTAL } from "../../../typechain-types";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("VirtualTAL", () => {
  let admin: SignerWithAddress;
  let talent: SignerWithAddress;
  let minter: SignerWithAddress;
  let investor: SignerWithAddress;

  let VirtualTALFactory: ContractFactory;
  let contract: VirtualTAL;

  beforeEach(async () => {
    [admin, talent, minter, investor] = await ethers.getSigners();

    // deploy template
    VirtualTALFactory = await ethers.getContractFactory("VirtualTAL");
  });

  describe("initialize", () => {
    it("can be deployed as a proxy", async () => {
      const action = upgrades.deployProxy(VirtualTALFactory, []);

      await expect(action).not.to.be.reverted;
    });
  });

  async function builder(): Promise<VirtualTAL> {
    return upgrades.deployProxy(VirtualTALFactory, []) as Promise<VirtualTAL>;
  }

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IERC20", "IAccessControl", "IERC1363"]);
  });

  describe("functions", () => {
    beforeEach(async () => {
      contract = await builder();
    });

    it("correctly sets the DEFAULT_ADMIN role", async () => {
      expect(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
    });

    describe("admin mint", () => {
      it("works when called by the admin", async () => {
        const action = contract.connect(admin).adminMint(investor.address, parseUnits("1"));

        await expect(action).not.to.be.reverted;
        expect(await contract.getBalance(investor.address)).to.equal(parseUnits("1"));
      });

      it("adds to previously minted values", async () => {
        contract.connect(admin).adminMint(investor.address, parseUnits("1"));

        const action = contract.connect(admin).adminMint(investor.address, parseUnits("2"));

        await expect(action).not.to.be.reverted;
        expect(await contract.getBalance(investor.address)).to.equal(parseUnits("3"));
      });

      it("is not callable by a non-admin", async () => {
        const action = contract.connect(investor).adminMint(investor.address, parseUnits("1"));

        await expect(action).to.be.reverted;
      });
    });

    describe("admin burn", () => {
      it("works when called by the admin", async () => {
        contract.connect(admin).adminMint(investor.address, parseUnits("3"));

        const action = contract.connect(admin).adminBurn(investor.address, parseUnits("1"));

        await expect(action).not.to.be.reverted;
        expect(await contract.getBalance(investor.address)).to.equal(parseUnits("2"));
      });

      it("does not work when amount is not enough", async () => {
        contract.connect(admin).adminMint(investor.address, parseUnits("2"));

        const action = contract.connect(admin).adminBurn(investor.address, parseUnits("3"));

        await expect(action).to.be.revertedWith("not enough amount to burn");
      });

      it("is not callable by a non-admin", async () => {
        const action = contract.connect(talent).adminBurn(talent.address, parseUnits("1"));

        await expect(action).to.be.reverted;
      });
    });

    describe("set admin role", () => {
      it("works when called by the admin", async () => {
        const action = contract.connect(admin).setAdminRole(investor.address);

        await expect(action).not.to.be.reverted;
        expect(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), investor.address)).to.be.true;
      });

      it("allows multiple admins", async () => {
        contract.connect(admin).setAdminRole(investor.address);

        expect(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), investor.address)).to.be.true;
        expect(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      });

      it("is not callable by a non-admin", async () => {
        const action = contract.connect(talent).setAdminRole(talent.address);

        await expect(action).to.be.reverted;
      });
    });

    describe("get balance", () => {
      it("returns 0 when there's no balance", async () => {
        const balance = await contract.getBalance(investor.address);

        expect(balance).to.eq(0)
      });

      it("returns the correct balance after multiple mints and burns", async () => {
        let balance = await contract.getBalance(investor.address);

        expect(balance).to.eq(0)

        await contract.connect(admin).adminMint(investor.address, parseUnits("1"));

        balance = await contract.getBalance(investor.address);

        expect(balance).to.eq(parseUnits("1"));

        await contract.connect(admin).adminMint(investor.address, parseUnits("9"));

        balance = await contract.getBalance(investor.address);

        expect(balance).to.eq(parseUnits("10"))

        await contract.connect(admin).adminBurn(investor.address, parseUnits("5"));

        balance = await contract.getBalance(investor.address);

        expect(balance).to.eq(parseUnits("5"))
      });
    });
  });
});
