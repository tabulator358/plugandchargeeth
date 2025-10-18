import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Integration Tests", function () {
  async function deployIntegrationFixture() {
    const [owner, driver1, driver2, chargerOwner1, chargerOwner2, sponsor1] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy("Mock USDC", "USDC", 6, owner.address);

    // Deploy VehicleRegistry
    const VehicleRegistry = await ethers.getContractFactory("VehicleRegistry");
    const vehicleRegistry = await VehicleRegistry.deploy(owner.address);

    // Deploy ChargerRegistry
    const ChargerRegistry = await ethers.getContractFactory("ChargerRegistry");
    const chargerRegistry = await ChargerRegistry.deploy(owner.address);

    // Deploy PlugAndChargeCore
    const PlugAndChargeCore = await ethers.getContractFactory("PlugAndChargeCore");
    const plugAndCharge = await PlugAndChargeCore.deploy(
      await usdc.getAddress(),
      await vehicleRegistry.getAddress(),
      await chargerRegistry.getAddress(),
      ethers.parseUnits("10", 6), // minDeposit: 10 USDC
      ethers.parseUnits("1000", 6), // maxDeposit: 1000 USDC
      3600, // refundTimeout: 1 hour
      owner.address, // initialOwner
    );

    // Register chargers
    await chargerRegistry
      .connect(owner)
      .registerCharger(1, chargerOwner1.address, 500000000, 140000000, 300, 50); // 50kW charger

    await chargerRegistry
      .connect(owner)
      .registerCharger(2, chargerOwner2.address, 510000000, 150000000, 350, 75); // 75kW charger

    // Give USDC to users
    await usdc.connect(owner).mint(driver1.address, ethers.parseUnits("10000", 6));
    await usdc.connect(owner).mint(driver2.address, ethers.parseUnits("10000", 6));
    await usdc.connect(owner).mint(sponsor1.address, ethers.parseUnits("10000", 6));

    return {
      owner,
      driver1,
      driver2,
      chargerOwner1,
      chargerOwner2,
      sponsor1,
      usdc,
      vehicleRegistry,
      chargerRegistry,
      plugAndCharge,
    };
  }

  describe("Complete User Journey", function () {
    it("Should handle complete driver journey: register vehicle → get USDC → add trusted charger → create session → charger proposes → settlement", async function () {
      const {
        driver1,
        chargerOwner1,
        usdc,
        vehicleRegistry,
        chargerRegistry,
        plugAndCharge,
      } = await loadFixture(deployIntegrationFixture);

      const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes("TESLA_MODEL_3_ABC123"));
      const chipHash = ethers.keccak256(ethers.toUtf8Bytes("CHIP_123456789"));
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes("0x1234abcd..."));
      const chargerId = 1;
      const sessionSalt = ethers.keccak256(ethers.toUtf8Bytes("session_salt_123"));
      const initialDeposit = ethers.parseUnits("50", 6);
      const proposedCharge = ethers.parseUnits("30", 6);

      // Step 1: Driver registers vehicle
      await vehicleRegistry.connect(driver1).registerVehicle(vehicleHash, chipHash, true, publicKeyHash);
      expect(await vehicleRegistry.ownerOfVehicle(vehicleHash)).to.equal(driver1.address);

      // Step 2: Driver gets USDC (already done in fixture)
      expect(await usdc.balanceOf(driver1.address)).to.equal(ethers.parseUnits("10000", 6));

      // Step 3: Driver adds charger as trusted
      await plugAndCharge.connect(driver1).setTrustedCharger(driver1.address, chargerId, true);
      expect(await plugAndCharge.trustedChargers(driver1.address, chargerId)).to.equal(true);

      // Step 4: Driver creates session
      await usdc.connect(driver1).approve(await plugAndCharge.getAddress(), initialDeposit);
      await expect(
        plugAndCharge
          .connect(driver1)
          .createSession(vehicleHash, chargerId, sessionSalt, initialDeposit, ethers.ZeroAddress, false, {
            value: 0,
            deadline: 0,
            v: 0,
            r: ethers.ZeroHash,
            s: ethers.ZeroHash,
          }),
      )
        .to.emit(plugAndCharge, "SessionCreated")
        .withArgs(1, driver1.address, ethers.ZeroAddress, vehicleHash, chargerId, initialDeposit);

      // Step 5: Charger ends session and proposes charge
      await expect(plugAndCharge.connect(chargerOwner1).endAndPropose(1, proposedCharge))
        .to.emit(plugAndCharge, "ChargeProposed")
        .withArgs(1, proposedCharge);

      // Step 6: Driver finalizes session (no dispute)
      await expect(plugAndCharge.connect(driver1).finalizeIfNoDispute(1))
        .to.emit(plugAndCharge, "Settled")
        .withArgs(1, initialDeposit - proposedCharge, proposedCharge);

      // Verify final state
      const session = await plugAndCharge.getSession(1);
      expect(session.state).to.equal(4); // Settled
      expect(session.proposed).to.equal(proposedCharge);
    });
  });
});
