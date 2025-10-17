import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ChargerRegistry", function () {
  async function deployChargerRegistryFixture() {
    const [owner, chargerOwner1, chargerOwner2] = await ethers.getSigners();

    const ChargerRegistry = await ethers.getContractFactory("ChargerRegistry");
    const chargerRegistry = await ChargerRegistry.deploy(owner.address);

    return { chargerRegistry, owner, chargerOwner1, chargerOwner2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { chargerRegistry, owner } = await loadFixture(deployChargerRegistryFixture);
      expect(await chargerRegistry.owner()).to.equal(owner.address);
    });
  });

  describe("Charger Registration", function () {
    it("Should allow owner to register a charger", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;
      const latE7 = 500000000; // 50.0 degrees
      const lngE7 = 140000000; // 14.0 degrees
      const pricePerKWhMilliUSD = 300; // $0.30 per kWh
      const powerKW = 50; // 50 kW

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(chargerId, chargerOwner1.address, latE7, lngE7, pricePerKWhMilliUSD, powerKW),
      )
        .to.emit(chargerRegistry, "ChargerRegistered")
        .withArgs(chargerId, chargerOwner1.address, latE7, lngE7, pricePerKWhMilliUSD, powerKW);

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.owner).to.equal(chargerOwner1.address);
      expect(charger.latE7).to.equal(latE7);
      expect(charger.lngE7).to.equal(lngE7);
      expect(charger.pricePerKWhMilliUSD).to.equal(pricePerKWhMilliUSD);
      expect(charger.powerKW).to.equal(powerKW);
      expect(charger.active).to.equal(true);
    });

    it("Should not allow non-owner to register charger", async function () {
      const { chargerRegistry, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;

      await expect(
        chargerRegistry
          .connect(chargerOwner1)
          .registerCharger(chargerId, chargerOwner1.address, 500000000, 140000000, 300, 50),
      ).to.be.revertedWithCustomError(chargerRegistry, "OwnableUnauthorizedAccount");
    });

    it("Should not allow registering charger with same ID twice", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;

      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId, chargerOwner1.address, 500000000, 140000000, 300, 50);

      await expect(
        chargerRegistry.connect(owner).registerCharger(chargerId, chargerOwner1.address, 500000000, 140000000, 300, 50),
      ).to.be.revertedWithCustomError(chargerRegistry, "ErrAlreadyRegistered");
    });
  });

  describe("Charger Updates", function () {
    it("Should allow charger owner to update charger details", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;

      // Register charger
      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId, chargerOwner1.address, 500000000, 140000000, 300, 50);

      // Update charger
      const newLatE7 = 510000000;
      const newLngE7 = 150000000;
      const newPricePerKWhMilliUSD = 350;
      const newPowerKW = 75;

      await expect(
        chargerRegistry
          .connect(chargerOwner1)
          .updateCharger(chargerId, newLatE7, newLngE7, newPricePerKWhMilliUSD, newPowerKW),
      )
        .to.emit(chargerRegistry, "ChargerUpdated")
        .withArgs(chargerId, newLatE7, newLngE7, newPricePerKWhMilliUSD, newPowerKW);

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.latE7).to.equal(newLatE7);
      expect(charger.lngE7).to.equal(newLngE7);
      expect(charger.pricePerKWhMilliUSD).to.equal(newPricePerKWhMilliUSD);
      expect(charger.powerKW).to.equal(newPowerKW);
    });

    it("Should not allow non-owner to update charger", async function () {
      const { chargerRegistry, owner, chargerOwner1, chargerOwner2 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;

      // Register charger
      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId, chargerOwner1.address, 500000000, 140000000, 300, 50);

      // Try to update with different owner
      await expect(
        chargerRegistry.connect(chargerOwner2).updateCharger(chargerId, 510000000, 150000000, 350, 75),
      ).to.be.revertedWithCustomError(chargerRegistry, "ErrNotChargerOwner");
    });

    it("Should not allow updating non-existent charger", async function () {
      const { chargerRegistry, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 999;

      await expect(
        chargerRegistry.connect(chargerOwner1).updateCharger(chargerId, 510000000, 150000000, 350, 75),
      ).to.be.revertedWithCustomError(chargerRegistry, "ErrNotRegistered");
    });
  });

  describe("Charger Activation", function () {
    it("Should allow charger owner to set active status", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;

      // Register charger
      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId, chargerOwner1.address, 500000000, 140000000, 300, 50);

      // Deactivate charger
      await expect(chargerRegistry.connect(chargerOwner1).setActive(chargerId, false))
        .to.emit(chargerRegistry, "ChargerActiveSet")
        .withArgs(chargerId, false);

      let charger = await chargerRegistry.get(chargerId);
      expect(charger.active).to.equal(false);

      // Reactivate charger
      await expect(chargerRegistry.connect(chargerOwner1).setActive(chargerId, true))
        .to.emit(chargerRegistry, "ChargerActiveSet")
        .withArgs(chargerId, true);

      charger = await chargerRegistry.get(chargerId);
      expect(charger.active).to.equal(true);
    });

    it("Should not allow non-owner to set active status", async function () {
      const { chargerRegistry, owner, chargerOwner1, chargerOwner2 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;

      // Register charger
      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId, chargerOwner1.address, 500000000, 140000000, 300, 50);

      // Try to set active with different owner
      await expect(chargerRegistry.connect(chargerOwner2).setActive(chargerId, false)).to.be.revertedWithCustomError(
        chargerRegistry,
        "ErrNotChargerOwner",
      );
    });
  });

  describe("Charger Queries", function () {
    it("Should return zero address for non-existent charger", async function () {
      const { chargerRegistry } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 999;

      expect(await chargerRegistry.ownerOf(chargerId)).to.equal(ethers.ZeroAddress);
    });

    it("Should return correct owner for registered charger", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;

      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId, chargerOwner1.address, 500000000, 140000000, 300, 50);

      expect(await chargerRegistry.ownerOf(chargerId)).to.equal(chargerOwner1.address);
    });

    it("Should revert when getting non-existent charger", async function () {
      const { chargerRegistry } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 999;

      await expect(chargerRegistry.get(chargerId)).to.be.revertedWithCustomError(chargerRegistry, "ErrNotRegistered");
    });
  });
});
