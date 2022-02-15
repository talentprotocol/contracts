import chai from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { ContractFactory } from "ethers";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import type { PerksFactory } from "../../typechain";
import { PerksFactory__factory } from "../../typechain";
import { ERC165, Artifacts } from "../shared";
import { findEvent } from "../shared/utils";

chai.use(solidity);

const { expect } = chai;
const { parseUnits } = ethers.utils;
const { deployContract } = waffle;

describe("PerksFactory", () => {
  let creator: SignerWithAddress;
  let talent1: SignerWithAddress;
  let talent2: SignerWithAddress;
  let supporter1: SignerWithAddress;
  let supporter2: SignerWithAddress;

  let perksFactory: PerksFactory;
  let PerksFactoryFactory: ContractFactory;

  beforeEach(async () => {
    [creator, talent1, talent2, supporter1, supporter2] = await ethers.getSigners();

    PerksFactoryFactory = await ethers.getContractFactory("PerksFactory");
  });

  it("can be deployed", async () => {
    const action = deployContract(creator, Artifacts.PerksFactory, []);

    await expect(action).not.to.be.reverted;
  });

  const builder = async (): Promise<PerksFactory> => {
    return upgrades.deployProxy(PerksFactoryFactory, []) as Promise<PerksFactory>;
  };

  describe("behaviour", () => {
    ERC165.behavesAsERC165(builder);
    ERC165.supportsInterfaces(builder, ["IERC165", "IAccessControl"]);
  });

  describe("functions", () => {
    beforeEach(async () => {
      perksFactory = (await upgrades.deployProxy(PerksFactoryFactory, [])) as PerksFactory;
    });

    describe("createTalent", () => {
      it("deploys a new perk", async () => {
        const tx = await perksFactory.connect(talent1).createPerk(
          talent1.address,
          "The perk title",
          "TICKER",
          1000,
          parseUnits("10"),
          false,
        );

        const event = await findEvent(tx, "PerkCreated");

        expect(event).to.be;
        expect(event?.args?.talent).to.eq(talent1.address);
      });

      it("sets the admin to the proxy's own admin", async () => {
        const tx = await perksFactory.connect(talent1).createPerk(
          talent1.address,
          "The perk title",
          "TICKER",
          1000,
          parseUnits("10"),
          false,
        );
        const event = await findEvent(tx, "PerkCreated");
        const owner = PerksFactory__factory.connect(event?.args?.token, creator);

        const factoryAdmin = await perksFactory.getRoleMember(await perksFactory.DEFAULT_ADMIN_ROLE(), 0);

        expect(await owner.hasRole(await owner.DEFAULT_ADMIN_ROLE(), factoryAdmin)).to.be.true;
      });

      it("can deploy two independent perks", async () => {
        const tx1 = await perksFactory.connect(creator).createPerk(
          talent1.address,
          "The perk title",
          "TICKER",
          1000,
          parseUnits("10"),
          false,
        );
        const tx2 = await perksFactory.connect(creator).createPerk(
          talent2.address,
          "The perk title2",
          "TICKER2",
          1000,
          parseUnits("10"),
          false,
        );

        const event1 = await findEvent(tx1, "PerkCreated");
        const event2 = await findEvent(tx2, "PerkCreated");

        expect(event1).to.be;
        expect(event2).to.be;
      });
    });
  });
});
