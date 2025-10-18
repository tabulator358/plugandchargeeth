import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("VehicleRegistry", function () {
  async function deployVehicleRegistryFixture() {
    const [owner, driver1, driver2] = await ethers.getSigners();

    const VehicleRegistry = await ethers.getContractFactory("VehicleRegistry");
    const vehicleRegistry = await VehicleRegistry.deploy(owner.address);

    return { vehicleRegistry, owner, driver1, driver2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { vehicleRegistry, owner } = await loadFixture(deployVehicleRegistryFixture);
      expect(await vehicleRegistry.owner()).to.equal(owner.address);
    });
  });

  describe("Vehicle Registration", function () {
    it("Should allow driver to register a vehicle", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));

      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));
      
      await expect(vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash))
        .to.emit(vehicleRegistry, "VehicleRegistered")
        .withArgs(vehicleHash, driver1.address, chipHash, true);

      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash)).to.equal(driver1.address);
    });

    it("Should not allow registering the same vehicle twice", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));

      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));
      
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash);

      await expect(vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash)).to.be.revertedWithCustomError(
        vehicleRegistry,
        "ErrAlreadyRegistered",
      );
    });

    it("Should not allow different driver to register already registered vehicle", async function () {
      const { vehicleRegistry, driver1, driver2 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));

      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));
      
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash);

      await expect(vehicleRegistry.connect(driver2).registerVehicle(vehicleHash, chipHash, true, publicKeyHash)).to.be.revertedWithCustomError(
        vehicleRegistry,
        "ErrAlreadyRegistered",
      );
    });
  });

  describe("Vehicle Unregistration", function () {
    it("Should allow driver to unregister their vehicle", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));

      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));
      
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash);

      await expect(vehicleRegistry.connect(driver1).unregisterVehicle(vehicleHash))
        .to.emit(vehicleRegistry, "VehicleUnregistered")
        .withArgs(vehicleHash, driver1.address);

      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash)).to.equal(ethers.ZeroAddress);
    });

    it("Should not allow unregistering non-existent vehicle", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("NON_EXISTENT_VEHICLE"));

      await expect(vehicleRegistry.connect(driver1).unregisterVehicle(vehicleHash)).to.be.revertedWithCustomError(
        vehicleRegistry,
        "ErrNotRegistered",
      );
    });

    it("Should not allow different driver to unregister vehicle", async function () {
      const { vehicleRegistry, driver1, driver2 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));

      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));
      
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash);

      await expect(vehicleRegistry.connect(driver2).unregisterVehicle(vehicleHash)).to.be.revertedWithCustomError(
        vehicleRegistry,
        "ErrNotDriver",
      );
    });
  });

  describe("Vehicle Ownership Queries", function () {
    it("Should return zero address for non-existent vehicle", async function () {
      const { vehicleRegistry } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("NON_EXISTENT_VEHICLE"));

      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash)).to.equal(ethers.ZeroAddress);
    });

    it("Should return correct owner for registered vehicle", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));

      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));
      
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash);

      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash)).to.equal(driver1.address);
    });
  });

  describe("Edge Cases and Boundary Values", function () {
    it("Should handle chip ID collision scenarios", async function () {
      const { vehicleRegistry, driver1, driver2 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash1 = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));
      const vehicleHash2 = ethers.keccak256(ethers.toUtf8Bytes("BMW_I3_XYZ789"));
      const sameChipHash = ethers.keccak256(ethers.toUtf8Bytes("SAME_CHIP_ID"));
      const publicKeyHash1 = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));
      const publicKeyHash2 = ethers.keccak256(ethers.toUtf8Bytes("0x5678efgh..."));

      // First driver registers vehicle
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash1, sameChipHash, true, publicKeyHash1);

      // Second driver tries to register vehicle with same chip ID (should fail)
      await expect(
        vehicleRegistry.connect(driver2).registerVehicle(vehicleHash2, sameChipHash, true, publicKeyHash2)
      ).to.be.revertedWithCustomError(vehicleRegistry, "ErrChipAlreadyRegistered");
    });

    it("Should handle ISO 15118 enable/disable workflows", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash1 = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ISO_ENABLED"));
      const vehicleHash2 = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ISO_DISABLED"));
      const chipHash1 = ethers.keccak256(ethers.toUtf8Bytes("CHIP_ISO_ENABLED"));
      const chipHash2 = ethers.keccak256(ethers.toUtf8Bytes("CHIP_ISO_DISABLED"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));

      // Register vehicle with ISO 15118 enabled
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash1, chipHash1, true, publicKeyHash);
      expect(await vehicleRegistry.isIso15118Enabled(vehicleHash1)).to.equal(true);

      // Register vehicle with ISO 15118 disabled
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash2, chipHash2, false, publicKeyHash);
      expect(await vehicleRegistry.isIso15118Enabled(vehicleHash2)).to.equal(false);
    });

    it("Should handle multiple vehicles per driver", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash1 = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));
      const vehicleHash2 = ethers.keccak256(ethers.toUtf8Bytes("BMW_I3_XYZ789"));
      const vehicleHash3 = ethers.keccak256(ethers.toUtf8Bytes("NISSAN_LEAF_DEF456"));
      
      const chipHash1 = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const chipHash2 = ethers.keccak256(ethers.toUtf8Bytes("CHIP_987654321"));
      const chipHash3 = ethers.keccak256(ethers.toUtf8Bytes("CHIP_456789123"));
      
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));

      // Register multiple vehicles for same driver
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash1, chipHash1, true, publicKeyHash);
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash2, chipHash2, false, publicKeyHash);
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash3, chipHash3, true, publicKeyHash);

      // Verify all vehicles belong to same driver
      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash1)).to.equal(driver1.address);
      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash2)).to.equal(driver1.address);
      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash3)).to.equal(driver1.address);

      // Verify chip to vehicle mapping
      expect(await vehicleRegistry.getVehicleByChip(chipHash1)).to.equal(vehicleHash1);
      expect(await vehicleRegistry.getVehicleByChip(chipHash2)).to.equal(vehicleHash2);
      expect(await vehicleRegistry.getVehicleByChip(chipHash3)).to.equal(vehicleHash3);
    });

    it("Should handle public key validation scenarios", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));
      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      
      // Test with different public key formats
      const publicKeyHash1 = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));
      const publicKeyHash2 = ethers.keccak256(ethers.toUtf8Bytes(""));
      const publicKeyHash3 = ethers.keccak256(ethers.toUtf8Bytes("very_long_public_key_string_that_might_be_used_in_real_world_scenarios"));

      // Register vehicle with normal public key
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash1);
      expect(await vehicleRegistry.getPublicKey(vehicleHash)).to.equal(publicKeyHash1);

      // Unregister and register with empty public key
      await vehicleRegistry.connect(driver1).unregisterVehicle(vehicleHash);
      const newChipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_987654321"));
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, newChipHash, true, publicKeyHash2);
      expect(await vehicleRegistry.getPublicKey(vehicleHash)).to.equal(publicKeyHash2);
    });

    it("Should handle very long vehicle identifiers", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const longVehicleId = "VERY_LONG_VEHICLE_IDENTIFIER_THAT_MIGHT_BE_USED_IN_REAL_WORLD_SCENARIOS_WITH_SPECIAL_CHARACTERS_!@#$%^&*()_+{}|:<>?[]\\;'\",./";
      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes(longVehicleId));
      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_LONG_VEHICLE"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));

      await expect(
        vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash)
      ).to.emit(vehicleRegistry, "VehicleRegistered");

      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash)).to.equal(driver1.address);
    });

    it("Should handle zero hash values", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const zeroHash = ethers.ZeroHash;
      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_ZERO_HASH"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));

      // Should be able to register with zero hash (though not recommended)
      await expect(
        vehicleRegistry.connect(driver1).registerVehicle(zeroHash, chipHash, true, publicKeyHash)
      ).to.emit(vehicleRegistry, "VehicleRegistered");

      expect(await vehicleRegistry.ownerOfVehicle(zeroHash)).to.equal(driver1.address);
    });

    it("Should handle maximum hash values", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const maxHash = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_MAX_HASH"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));

      await expect(
        vehicleRegistry.connect(driver1).registerVehicle(maxHash, chipHash, true, publicKeyHash)
      ).to.emit(vehicleRegistry, "VehicleRegistered");

      expect(await vehicleRegistry.ownerOfVehicle(maxHash)).to.equal(driver1.address);
    });

    it("Should handle concurrent registration attempts", async function () {
      const { vehicleRegistry, driver1, driver2 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash1 = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));
      const vehicleHash2 = ethers.keccak256(ethers.toUtf8Bytes("BMW_I3_XYZ789"));
      const chipHash1 = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const chipHash2 = ethers.keccak256(ethers.toUtf8Bytes("CHIP_987654321"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));

      // Both drivers try to register different vehicles simultaneously
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash1, chipHash1, true, publicKeyHash);
      await vehicleRegistry.connect(driver2).registerVehicle(vehicleHash2, chipHash2, false, publicKeyHash);

      // Both should succeed
      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash1)).to.equal(driver1.address);
      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash2)).to.equal(driver2.address);
    });

    it("Should handle unregistering and re-registering same vehicle", async function () {
      const { vehicleRegistry, driver1 } = await loadFixture(deployVehicleRegistryFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));
      const chipHash1 = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const chipHash2 = ethers.keccak256(ethers.toUtf8Bytes("CHIP_987654321"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));

      // Register vehicle
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash1, true, publicKeyHash);
      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash)).to.equal(driver1.address);

      // Unregister vehicle
      await vehicleRegistry.connect(driver1).unregisterVehicle(vehicleHash);
      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash)).to.equal(ethers.ZeroAddress);

      // Re-register with different chip ID
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash2, false, publicKeyHash);
      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash)).to.equal(driver1.address);
      expect(await vehicleRegistry.getVehicleByChip(chipHash2)).to.equal(vehicleHash);
    });
  });
});
