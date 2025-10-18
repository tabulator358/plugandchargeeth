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

    it("Should allow anyone to register charger", async function () {
      const { chargerRegistry, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 2; // Use different ID to avoid conflict
      const latE7 = 500000000;
      const lngE7 = 140000000;
      const pricePerKWhMilliUSD = 300;
      const powerKW = 50;

      await expect(
        chargerRegistry
          .connect(chargerOwner1)
          .registerCharger(chargerId, chargerOwner1.address, latE7, lngE7, pricePerKWhMilliUSD, powerKW),
      ).to.emit(chargerRegistry, "ChargerRegistered")
        .withArgs(chargerId, chargerOwner1.address, latE7, lngE7, pricePerKWhMilliUSD, powerKW);

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.owner).to.equal(chargerOwner1.address);
      expect(charger.latE7).to.equal(latE7);
      expect(charger.lngE7).to.equal(lngE7);
      expect(charger.pricePerKWhMilliUSD).to.equal(pricePerKWhMilliUSD);
      expect(charger.powerKW).to.equal(powerKW);
      expect(charger.active).to.equal(true);
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

  describe("Edge Cases and Boundary Values", function () {
    it("Should handle extreme latitude coordinates", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;
      const extremeLat = 900000000; // 90.0 degrees (North Pole)
      const lng = 140000000;
      const pricePerKWhMilliUSD = 300;
      const powerKW = 50;

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(chargerId, chargerOwner1.address, extremeLat, lng, pricePerKWhMilliUSD, powerKW),
      ).to.emit(chargerRegistry, "ChargerRegistered");

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.latE7).to.equal(extremeLat);
    });

    it("Should handle extreme longitude coordinates", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 2;
      const lat = 500000000;
      const extremeLng = 1800000000; // 180.0 degrees (International Date Line)
      const pricePerKWhMilliUSD = 300;
      const powerKW = 50;

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(chargerId, chargerOwner1.address, lat, extremeLng, pricePerKWhMilliUSD, powerKW),
      ).to.emit(chargerRegistry, "ChargerRegistered");

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.lngE7).to.equal(extremeLng);
    });

    it("Should handle negative coordinates", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 3;
      const negativeLat = -500000000; // -50.0 degrees (South)
      const negativeLng = -140000000; // -140.0 degrees (West)
      const pricePerKWhMilliUSD = 300;
      const powerKW = 50;

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(chargerId, chargerOwner1.address, negativeLat, negativeLng, pricePerKWhMilliUSD, powerKW),
      ).to.emit(chargerRegistry, "ChargerRegistered");

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.latE7).to.equal(negativeLat);
      expect(charger.lngE7).to.equal(negativeLng);
    });

    it("Should handle zero price per kWh", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 4;
      const lat = 500000000;
      const lng = 140000000;
      const zeroPrice = 0; // Free charging
      const powerKW = 50;

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(chargerId, chargerOwner1.address, lat, lng, zeroPrice, powerKW),
      ).to.emit(chargerRegistry, "ChargerRegistered");

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.pricePerKWhMilliUSD).to.equal(zeroPrice);
    });

    it("Should handle maximum price per kWh", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 5;
      const lat = 500000000;
      const lng = 140000000;
      const maxPrice = 4294967295; // Max uint32
      const powerKW = 50;

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(chargerId, chargerOwner1.address, lat, lng, maxPrice, powerKW),
      ).to.emit(chargerRegistry, "ChargerRegistered");

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.pricePerKWhMilliUSD).to.equal(maxPrice);
    });

    it("Should handle zero power", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 6;
      const lat = 500000000;
      const lng = 140000000;
      const pricePerKWhMilliUSD = 300;
      const zeroPower = 0; // No power output

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(chargerId, chargerOwner1.address, lat, lng, pricePerKWhMilliUSD, zeroPower),
      ).to.emit(chargerRegistry, "ChargerRegistered");

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.powerKW).to.equal(zeroPower);
    });

    it("Should handle maximum power", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 7;
      const lat = 500000000;
      const lng = 140000000;
      const pricePerKWhMilliUSD = 300;
      const maxPower = 65535; // Max uint16

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(chargerId, chargerOwner1.address, lat, lng, pricePerKWhMilliUSD, maxPower),
      ).to.emit(chargerRegistry, "ChargerRegistered");

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.powerKW).to.equal(maxPower);
    });

    it("Should handle multiple chargers per owner", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId1 = 1;
      const chargerId2 = 2;
      const chargerId3 = 3;

      // Register multiple chargers for same owner
      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId1, chargerOwner1.address, 500000000, 140000000, 300, 50);

      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId2, chargerOwner1.address, 510000000, 150000000, 350, 75);

      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId3, chargerOwner1.address, 520000000, 160000000, 400, 100);

      // Verify all chargers belong to same owner
      expect(await chargerRegistry.ownerOf(chargerId1)).to.equal(chargerOwner1.address);
      expect(await chargerRegistry.ownerOf(chargerId2)).to.equal(chargerOwner1.address);
      expect(await chargerRegistry.ownerOf(chargerId3)).to.equal(chargerOwner1.address);

      // Verify different properties
      const charger1 = await chargerRegistry.get(chargerId1);
      const charger2 = await chargerRegistry.get(chargerId2);
      const charger3 = await chargerRegistry.get(chargerId3);

      expect(charger1.powerKW).to.equal(50);
      expect(charger2.powerKW).to.equal(75);
      expect(charger3.powerKW).to.equal(100);
    });

    it("Should handle concurrent update attempts", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const chargerId = 1;

      // Register charger
      await chargerRegistry
        .connect(owner)
        .registerCharger(chargerId, chargerOwner1.address, 500000000, 140000000, 300, 50);

      // First update
      await chargerRegistry
        .connect(chargerOwner1)
        .updateCharger(chargerId, 510000000, 150000000, 350, 75);

      // Second update immediately after
      await chargerRegistry
        .connect(chargerOwner1)
        .updateCharger(chargerId, 520000000, 160000000, 400, 100);

      const charger = await chargerRegistry.get(chargerId);
      expect(charger.latE7).to.equal(520000000);
      expect(charger.lngE7).to.equal(160000000);
      expect(charger.pricePerKWhMilliUSD).to.equal(400);
      expect(charger.powerKW).to.equal(100);
    });

    it("Should handle very large charger IDs", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const largeChargerId = 2n ** 256n - 1n; // Max uint256
      const lat = 500000000;
      const lng = 140000000;
      const pricePerKWhMilliUSD = 300;
      const powerKW = 50;

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(largeChargerId, chargerOwner1.address, lat, lng, pricePerKWhMilliUSD, powerKW),
      ).to.emit(chargerRegistry, "ChargerRegistered");

      expect(await chargerRegistry.ownerOf(largeChargerId)).to.equal(chargerOwner1.address);
    });

    it("Should handle zero charger ID", async function () {
      const { chargerRegistry, owner, chargerOwner1 } = await loadFixture(deployChargerRegistryFixture);

      const zeroChargerId = 0;
      const lat = 500000000;
      const lng = 140000000;
      const pricePerKWhMilliUSD = 300;
      const powerKW = 50;

      await expect(
        chargerRegistry
          .connect(owner)
          .registerCharger(zeroChargerId, chargerOwner1.address, lat, lng, pricePerKWhMilliUSD, powerKW),
      ).to.emit(chargerRegistry, "ChargerRegistered");

      expect(await chargerRegistry.ownerOf(zeroChargerId)).to.equal(chargerOwner1.address);
    });
  });
});
