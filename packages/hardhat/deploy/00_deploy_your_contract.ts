import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the Plug and Charge system contracts:
 * - MockUSDC: Test USDC token
 * - VehicleRegistry: Vehicle registration system
 * - ChargerRegistry: Charging station registry
 * - PlugAndChargeCore: Main charging session contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployPlugAndChargeSystem: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🚀 Deploying Plug and Charge System...");

  // 1. Deploy MockUSDC
  console.log("📄 Deploying MockUSDC...");
  const mockUSDC = await deploy("MockUSDC", {
    from: deployer,
    args: ["Mock USDC", "USDC", 6, deployer], // name, symbol, decimals, initialOwner
    log: true,
    autoMine: true,
  });

  // 2. Deploy VehicleRegistry
  console.log("🚗 Deploying VehicleRegistry...");
  const vehicleRegistry = await deploy("VehicleRegistry", {
    from: deployer,
    args: [deployer], // initialOwner
    log: true,
    autoMine: true,
  });

  // 3. Deploy ChargerRegistry
  console.log("🔌 Deploying ChargerRegistry...");
  const chargerRegistry = await deploy("ChargerRegistry", {
    from: deployer,
    args: [deployer], // initialOwner
    log: true,
    autoMine: true,
  });

  // 4. Deploy PlugAndChargeCore
  console.log("⚡ Deploying PlugAndChargeCore...");
  const plugAndCharge = await deploy("PlugAndChargeCore", {
    from: deployer,
    args: [
      mockUSDC.address, // USDC token
      vehicleRegistry.address, // VehicleRegistry
      chargerRegistry.address, // ChargerRegistry
      hre.ethers.parseUnits("10", 6), // minDeposit: 10 USDC
      hre.ethers.parseUnits("1000", 6), // maxDeposit: 1000 USDC
      3600, // refundTimeout: 1 hour
      deployer, // initialOwner
    ],
    log: true,
    autoMine: true,
  });

  // Get deployed contracts for verification
  const mockUSDCContract = await hre.ethers.getContract<Contract>("MockUSDC", deployer);
  const vehicleRegistryContract = await hre.ethers.getContract<Contract>("VehicleRegistry", deployer);
  const chargerRegistryContract = await hre.ethers.getContract<Contract>("ChargerRegistry", deployer);
  const plugAndChargeContract = await hre.ethers.getContract<Contract>("PlugAndChargeCore", deployer);

  console.log("✅ Deployment Summary:");
  console.log("📄 MockUSDC:", mockUSDC.address);
  console.log("🚗 VehicleRegistry:", vehicleRegistry.address);
  console.log("🔌 ChargerRegistry:", chargerRegistry.address);
  console.log("⚡ PlugAndChargeCore:", plugAndCharge.address);

  // Verify initial state
  console.log("🔍 Verifying deployment...");
  console.log("💰 MockUSDC total supply:", hre.ethers.formatUnits(await mockUSDCContract.totalSupply(), 6), "USDC");
  console.log("👤 VehicleRegistry owner:", await vehicleRegistryContract.owner());
  console.log("👤 ChargerRegistry owner:", await chargerRegistryContract.owner());
  console.log("👤 PlugAndChargeCore owner:", await plugAndChargeContract.owner());
  console.log("⚙️  Min deposit:", hre.ethers.formatUnits(await plugAndChargeContract.minDeposit(), 6), "USDC");
  console.log("⚙️  Max deposit:", hre.ethers.formatUnits(await plugAndChargeContract.maxDeposit(), 6), "USDC");
  console.log("⏰ Refund timeout:", await plugAndChargeContract.refundTimeout(), "seconds");

  console.log("🎉 Plug and Charge System deployed successfully!");
};

export default deployPlugAndChargeSystem;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags PlugAndChargeSystem
deployPlugAndChargeSystem.tags = ["PlugAndChargeSystem"];
