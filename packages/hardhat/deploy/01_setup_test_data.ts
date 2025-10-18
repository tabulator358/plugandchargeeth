import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Sets up test data for Plug and Charge system:
 * - 6 vehicle owners with accounts and USDC
 * - 40 different vehicles registered
 * - 5 chargers in Rome with different locations
 * - Active charging sessions for testing
 * - Trust relationships for automatic charging
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const setupTestData: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { get } = hre.deployments;

  console.log("🔧 Setting up test data...");

  // Get deployed contracts
  const mockUSDC = await get("MockUSDC");
  const vehicleRegistry = await get("VehicleRegistry");
  const chargerRegistry = await get("ChargerRegistry");
  const plugAndChargeCore = await get("PlugAndChargeCore");

  const mockUSDCContract = await hre.ethers.getContract<Contract>("MockUSDC", deployer);
  const vehicleRegistryContract = await hre.ethers.getContract<Contract>("VehicleRegistry", deployer);
  const chargerRegistryContract = await hre.ethers.getContract<Contract>("ChargerRegistry", deployer);
  const plugAndChargeContract = await hre.ethers.getContract<Contract>("PlugAndChargeCore", deployer);

  // Rome coordinates (latitude, longitude in E7 format)
  const romeCoordinates = [
    { lat: 419000000, lng: 125000000 }, // Vatican City
    { lat: 418000000, lng: 125000000 }, // Colosseum area
    { lat: 420000000, lng: 124000000 }, // Termini Station
    { lat: 419000000, lng: 124000000 }, // Trastevere
    { lat: 420000000, lng: 125000000 }, // EUR district
  ];

  // Use hardhat accounts for car owners and charger operators
  console.log("👥 Setting up test accounts...");
  const allAccounts = await hre.ethers.getSigners();
  
  // Use hardhat accounts (deployer is index 0, others are 1-19)
  // Car owners: accounts 1 and 2
  // Charger operators: accounts 3 and 4
  const carOwner1 = allAccounts[1]; // 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  const carOwner2 = allAccounts[2]; // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  const chargerOp1 = allAccounts[3]; // 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  const chargerOp2 = allAccounts[4]; // 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
  
  const testAccounts = [
    { address: carOwner1.address, signer: carOwner1, role: "car_owner" },
    { address: carOwner2.address, signer: carOwner2, role: "car_owner" },
    { address: chargerOp1.address, signer: chargerOp1, role: "charger_operator" },
    { address: chargerOp2.address, signer: chargerOp2, role: "charger_operator" },
  ];

  // Mint USDC to test accounts
  console.log("💰 Minting USDC to test accounts...");
  const usdcAmount = hre.ethers.parseUnits("10000", 6); // 10,000 USDC each
  for (const account of testAccounts) {
    await mockUSDCContract.mint(account.address, usdcAmount);
  }

  // Register 5 chargers in Rome
  console.log("🔌 Registering 5 chargers in Rome...");
  const chargerData = [
    { id: 1, name: "Vatican City Charger", power: 50, price: 250, owner: chargerOp1 }, // €0.25/kWh
    { id: 2, name: "Colosseum Charger", power: 150, price: 300, owner: chargerOp1 },  // €0.30/kWh
    { id: 3, name: "Termini Station Charger", power: 75, price: 280, owner: chargerOp2 }, // €0.28/kWh
    { id: 4, name: "Trastevere Charger", power: 100, price: 320, owner: chargerOp2 }, // €0.32/kWh
    { id: 5, name: "EUR District Charger", power: 200, price: 270, owner: chargerOp1 }, // €0.27/kWh
  ];

  for (let i = 0; i < 5; i++) {
    const charger = chargerData[i];
    const coords = romeCoordinates[i];
    
    await chargerRegistryContract.registerCharger(
      charger.id,
      charger.owner.address, // charger owner
      coords.lat,
      coords.lng,
      charger.price,
      charger.power
    );
    
    console.log(`✅ Registered charger ${charger.id}: ${charger.name} at (${coords.lat}, ${coords.lng}) owned by ${charger.owner.address}`);
  }

  // Register 20 vehicles (10 vehicles per car owner)
  console.log("🚗 Registering 20 vehicles...");
  const vehicleBrands = ["Tesla", "BMW", "Mercedes", "Audi", "Volkswagen", "Nissan", "Hyundai"];
  const vehicleModels = ["Model S", "iX", "EQS", "e-tron", "ID.4", "Leaf", "Ioniq"];
  
  const carOwners = testAccounts.filter(acc => acc.role === "car_owner");
  
  for (let i = 0; i < 20; i++) {
    const ownerIndex = i % carOwners.length;
    const owner = carOwners[ownerIndex];
    
    // Generate unique vehicle data
    const brand = vehicleBrands[i % vehicleBrands.length];
    const model = vehicleModels[i % vehicleModels.length];
    const year = 2020 + (i % 4);
    
    // Create unique vehicle hash
    const vehicleData = `${brand}-${model}-${year}-${i}`;
    const vehicleHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(vehicleData));
    
    // Create unique chip ID
    const chipData = `CHIP-${i}-${owner.address.slice(0, 8)}`;
    const chipId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(chipData));
    
    // Generate public key hash
    const publicKeyData = `PK-${vehicleData}-${Date.now()}`;
    const publicKeyHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(publicKeyData));
    
    // Register vehicle
    await vehicleRegistryContract.connect(owner.signer)
      .registerVehicle(
        vehicleHash,
        chipId,
        true, // ISO 15118 enabled
        publicKeyHash,
        `ISO-15118-${i + 1}` // ISO 15118 identifier
      );
    
    if ((i + 1) % 10 === 0) {
      console.log(`✅ Registered ${i + 1}/20 vehicles`);
    }
  }

  // Set up trust relationships (each car owner trusts 2-3 chargers)
  console.log("🤝 Setting up trust relationships...");
  for (const owner of carOwners) {
    const trustedChargers = [1, 2, 3]; // First 3 chargers are trusted by all car owners
    
    for (const chargerId of trustedChargers) {
      await plugAndChargeContract.connect(owner.signer)
        .setTrustedCharger(owner.address, chargerId, true);
    }
    
    console.log(`✅ Car owner ${owner.address} trusts chargers: ${trustedChargers.join(', ')}`);
  }

  // Create active charging sessions
  console.log("⚡ Creating active charging sessions...");
  
  // Approve USDC spending for test accounts
  const sessionDeposit = hre.ethers.parseUnits("100", 6); // 100 USDC deposit
  for (const account of testAccounts) {
    await mockUSDCContract.connect(account.signer)
      .approve(plugAndChargeCore.address, hre.ethers.parseUnits("1000", 6));
  }

  // Create sessions from driver side (car owners)
  for (let i = 0; i < carOwners.length; i++) {
    const owner = carOwners[i];
    const chargerId = (i % 3) + 1; // Use first 3 chargers
    
    // Get vehicle hash for this owner (first vehicle)
    const vehicleIndex = i;
    const brand = vehicleBrands[vehicleIndex % vehicleBrands.length];
    const model = vehicleModels[vehicleIndex % vehicleModels.length];
    const year = 2020 + (vehicleIndex % 4);
    const vehicleData = `${brand}-${model}-${year}-${vehicleIndex}`;
    const vehicleHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(vehicleData));
    
    // Create session salt
    const sessionSalt = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`session-${i}-${Date.now()}`));
    
    await plugAndChargeContract.connect(owner.signer)
      .createSession(
        vehicleHash,
        chargerId,
        sessionSalt,
        sessionDeposit,
        hre.ethers.ZeroAddress, // no sponsor
        false, // no permit
        {
          value: 0,
          deadline: 0,
          v: 0,
          r: hre.ethers.ZeroHash,
          s: hre.ethers.ZeroHash
        }
      );
    
    console.log(`✅ Created driver-initiated session for car owner ${owner.address} at charger ${chargerId}`);
  }

  // Create sessions from charger side (charger operators)
  const chargerOperators = testAccounts.filter(acc => acc.role === "charger_operator");
  for (let i = 0; i < chargerOperators.length; i++) {
    const chargerOp = chargerOperators[i];
    
    // Each charger operator owns specific chargers:
    // chargerOp1 (index 3) owns chargers 1, 2, 5
    // chargerOp2 (index 4) owns chargers 3, 4
    const ownedChargers = i === 0 ? [1, 2, 5] : [3, 4];
    const chargerId = ownedChargers[0]; // Use first owned charger
    
    // Get vehicle hash for a car owner
    const carOwner = carOwners[i % carOwners.length];
    const vehicleIndex = i + 10; // Use different vehicle index to avoid conflicts
    const brand = vehicleBrands[vehicleIndex % vehicleBrands.length];
    const model = vehicleModels[vehicleIndex % vehicleModels.length];
    const year = 2020 + (vehicleIndex % 4);
    const vehicleData = `${brand}-${model}-${year}-${vehicleIndex}`;
    const vehicleHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(vehicleData));
    
    // Create session salt
    const sessionSalt = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`session-${i}-${Date.now()}`));
    
    await plugAndChargeContract.connect(chargerOp.signer)
      .createSessionByCharger(
        vehicleHash,
        chargerId,
        sessionSalt,
        carOwner.address, // payer
        sessionDeposit,
        false, // no permit
        {
          value: 0,
          deadline: 0,
          v: 0,
          r: hre.ethers.ZeroHash,
          s: hre.ethers.ZeroHash
        }
      );
    
    console.log(`✅ Created charger-initiated session for charger operator ${chargerOp.address} at charger ${chargerId}`);
  }

  console.log("\n🎉 Test data setup complete!");
  console.log("\n📊 Summary:");
  console.log(`👥 Car owners: ${carOwners.length}`);
  console.log(`🔌 Charger operators: ${chargerOperators.length}`);
  console.log(`🚗 Registered vehicles: 20`);
  console.log(`🔌 Chargers in Rome: 5`);
  console.log(`⚡ Active sessions: ${carOwners.length + chargerOperators.length}`);
  console.log(`🤝 Trust relationships: ${carOwners.length * 3}`);
  
  console.log("\n📍 Charger locations in Rome:");
  chargerData.forEach((charger, i) => {
    const coords = romeCoordinates[i];
    console.log(`  ${charger.id}. ${charger.name} - (${coords.lat/10000000}, ${coords.lng/10000000}) - Owner: ${charger.owner.address}`);
  });
  
  console.log("\n🔑 Test account addresses:");
  console.log("Car Owners:");
  carOwners.forEach((account, i) => {
    console.log(`  Car Owner ${i + 1}: ${account.address}`);
  });
  console.log("Charger Operators:");
  chargerOperators.forEach((account, i) => {
    console.log(`  Charger Operator ${i + 1}: ${account.address}`);
  });
};

export default setupTestData;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags SetupTestData
setupTestData.tags = ["SetupTestData"];
setupTestData.dependencies = ["PlugAndChargeSystem"];
