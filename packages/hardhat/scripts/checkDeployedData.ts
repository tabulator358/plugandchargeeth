import { HardhatRuntimeEnvironment } from "hardhat";

/**
 * Script to check if test data is properly deployed
 */
async function checkDeployedData(hre: HardhatRuntimeEnvironment) {
  console.log("🔍 Checking deployed test data...");
  
  const { get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  
  try {
    // Get contracts
    const mockUSDC = await hre.ethers.getContract("MockUSDC", deployer);
    const vehicleRegistry = await hre.ethers.getContract("VehicleRegistry", deployer);
    const chargerRegistry = await hre.ethers.getContract("ChargerRegistry", deployer);
    const plugAndCharge = await hre.ethers.getContract("PlugAndChargeCore", deployer);
    
    // Get hardhat accounts (same as deploy script)
    const allAccounts = await hre.ethers.getSigners();
    const testAccounts = [];
    for (let i = 0; i < 6; i++) {
      const account = allAccounts[i + 1]; // Skip deployer (index 0)
      testAccounts.push({
        address: account.address,
        index: i + 1
      });
    }
    
    console.log("\n💰 Account Balances:");
    console.log("-".repeat(50));
    for (const account of testAccounts) {
      try {
        const balance = await mockUSDC.balanceOf(account.address);
        console.log(`Owner ${account.index}: ${hre.ethers.formatUnits(balance, 6)} USDC`);
      } catch (error) {
        console.log(`Owner ${account.index}: Error reading balance`);
      }
    }
    
    console.log("\n🔌 Charger Check:");
    console.log("-".repeat(50));
    for (let i = 1; i <= 5; i++) {
      try {
        const charger = await chargerRegistry.get(i);
        const lat = Number(charger.latE7) / 10000000;
        const lng = Number(charger.lngE7) / 10000000;
        const price = Number(charger.pricePerKWhMilliUSD) / 1000;
        
        console.log(`Charger ${i}:`);
        console.log(`  Owner: ${charger.owner}`);
        console.log(`  Location: (${lat}, ${lng})`);
        console.log(`  Power: ${Number(charger.powerKW)} kW`);
        console.log(`  Price: ${price} €/kWh`);
        console.log(`  Active: ${charger.active}`);
        console.log("");
      } catch (error) {
        console.log(`Charger ${i}: Error - ${error.message}`);
      }
    }
    
    console.log("\n🚗 Vehicle Check (first 10):");
    console.log("-".repeat(50));
    
    const vehicleBrands = ["Tesla", "BMW", "Mercedes", "Audi", "Volkswagen", "Nissan", "Hyundai"];
    let foundVehicles = 0;
    
    for (let i = 0; i < 10; i++) {
      const brand = vehicleBrands[i % vehicleBrands.length];
      const model = ["Model S", "iX", "EQS", "e-tron", "ID.4", "Leaf", "Ioniq"][i % 7];
      const year = 2020 + (i % 4);
      const vehicleData = `${brand}-${model}-${year}-${i}`;
      const vehicleHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(vehicleData));
      
      try {
        const owner = await vehicleRegistry.ownerOfVehicle(vehicleHash);
        if (owner !== hre.ethers.ZeroAddress) {
          foundVehicles++;
          console.log(`Vehicle ${i + 1}: ${vehicleData}`);
          console.log(`  Hash: ${vehicleHash}`);
          console.log(`  Owner: ${owner}`);
          console.log("");
        }
      } catch (error) {
        console.log(`Vehicle ${i + 1}: Error - ${error.message}`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`Found vehicles: ${foundVehicles}/10 checked`);
    
    console.log("\n⚡ Session Check (first 3):");
    console.log("-".repeat(50));
    for (let i = 1; i <= 3; i++) {
      try {
        const session = await plugAndCharge.getSession(i);
        console.log(`Session ${i}:`);
        console.log(`  Driver: ${session.driver}`);
        console.log(`  Charger ID: ${session.chargerId}`);
        console.log(`  State: ${session.state}`);
        console.log(`  Reserved: ${hre.ethers.formatUnits(session.reserved, 6)} USDC`);
        console.log("");
      } catch (error) {
        console.log(`Session ${i}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error checking deployed data:", error);
  }
}

// Run the script
checkDeployedData(require("hardhat")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
