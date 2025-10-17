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
});
