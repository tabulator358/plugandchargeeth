import { HardhatRuntimeEnvironment } from "hardhat";

/**
 * Script to get test account information for UI testing
 * Run this after deploying with test data to get account details
 */
async function getTestAccounts(hre: HardhatRuntimeEnvironment) {
  console.log("🔍 Getting test account information...");
  
  const { get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  
  try {
    // Get deployed contracts
    const mockUSDC = await get("MockUSDC");
    const plugAndChargeCore = await get("PlugAndChargeCore");
    
    const mockUSDCContract = await hre.ethers.getContract("MockUSDC", deployer);
    const plugAndChargeContract = await hre.ethers.getContract("PlugAndChargeCore", deployer);
    
    console.log("\n📊 Contract Addresses:");
    console.log("MockUSDC:", mockUSDC.address);
    console.log("PlugAndChargeCore:", plugAndChargeCore.address);
    console.log("VehicleRegistry:", (await get("VehicleRegistry")).address);
    console.log("ChargerRegistry:", (await get("ChargerRegistry")).address);
    
    // Get the same test accounts as in deploy script (hardhat accounts 1-6)
    const testAccounts = [];
    const allAccounts = await hre.ethers.getSigners();
    
    for (let i = 0; i < 6; i++) {
      const account = allAccounts[i + 1]; // Skip deployer (index 0)
      testAccounts.push({
        address: account.address,
        privateKey: "", // Hardhat accounts don't expose private keys
        index: i + 1
      });
    }
    
    console.log("\n🔑 Test Account Details:");
    console.log("=".repeat(80));
    
    for (const account of testAccounts) {
      try {
        const balance = await mockUSDCContract.balanceOf(account.address);
        console.log(`\n👤 Owner ${account.index}:`);
        console.log(`   Address: ${account.address}`);
        console.log(`   Private Key: Use hardhat accounts (see hardhat.config.ts)`);
        console.log(`   USDC Balance: ${hre.ethers.formatUnits(balance, 6)} USDC`);
      } catch (error) {
        console.log(`\n👤 Owner ${account.index}:`);
        console.log(`   Address: ${account.address}`);
        console.log(`   Private Key: Use hardhat accounts (see hardhat.config.ts)`);
        console.log(`   USDC Balance: Not deployed yet (run deploy first)`);
      }
    }
    
    console.log("\n🔌 Charger Information:");
    console.log("=".repeat(80));
    
    const chargerRegistry = await hre.ethers.getContract("ChargerRegistry", deployer);
    
    for (let i = 1; i <= 5; i++) {
      try {
        const charger = await chargerRegistry.get(i);
        console.log(`\n🔌 Charger ${i}:`);
        console.log(`   Owner: ${charger.owner}`);
        console.log(`   Location: (${charger.latE7/10000000}, ${charger.lngE7/10000000})`);
        console.log(`   Power: ${charger.powerKW} kW`);
        console.log(`   Price: ${charger.pricePerKWhMilliUSD/1000} €/kWh`);
        console.log(`   Active: ${charger.active}`);
      } catch (error) {
        console.log(`\n🔌 Charger ${i}: Not deployed yet`);
      }
    }
    
    console.log("\n📝 Usage Instructions:");
    console.log("=".repeat(80));
    console.log("1. These are hardhat test accounts (no private keys needed)");
    console.log("2. Use them directly in your UI for testing");
    console.log("3. Switch to localhost network (http://localhost:8545)");
    console.log("4. Start testing the UI with these accounts");
    console.log("\n💡 Tip: Use different accounts for different user roles:");
    console.log("   - Owner 1-3: Vehicle owners with driver-initiated sessions");
    console.log("   - Owner 4-6: Vehicle owners with charger-initiated sessions");
    console.log("\n🔑 Hardhat Account Private Keys (for MetaMask):");
    console.log("   Account 1: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    console.log("   Account 2: 0x5de4111daa5ba4e5b4c4c1b4b4c4c1b4b4c4c1b4b4c4c1b4b4c4c1b4b4c4c1b4b");
    console.log("   Account 3: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
    console.log("   Account 4: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a");
    console.log("   Account 5: 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba");
    console.log("   Account 6: 0x92db14e403b83dfe3df233f83dfa233a43f2c2c2c2c2c2c2c2c2c2c2c2c2c2c");
    
  } catch (error) {
    console.error("❌ Error getting test accounts:", error);
    console.log("\n💡 Make sure you have deployed the contracts first:");
    console.log("   yarn deploy");
  }
}

// Run the script
getTestAccounts(require("hardhat")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
