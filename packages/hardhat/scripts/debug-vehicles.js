#!/usr/bin/env node

const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 Debugging Vehicle Registry...\n');

  // Get test accounts
  const [deployer, carOwner1, carOwner2] = await ethers.getSigners();
  
  // Get deployed contracts
  const vehicleRegistry = await ethers.getContractAt('VehicleRegistry', '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');

  console.log('🚗 Checking vehicles for Car Owner 1:', carOwner1.address);
  
  // Try to get vehicles by different methods
  try {
    // Method 1: Try to get vehicle by chip ID
    const chipId = ethers.keccak256(ethers.toUtf8Bytes('chip 31848912'));
    console.log('  Chip ID hash:', chipId);
    const vehicleHash1 = await vehicleRegistry.getVehicleByChip(chipId);
    console.log('  Vehicle Hash from chip:', vehicleHash1);
    
    if (vehicleHash1 !== ethers.ZeroHash) {
      const owner1 = await vehicleRegistry.ownerOfVehicle(vehicleHash1);
      console.log('  Owner of vehicle:', owner1);
    }
  } catch (error) {
    console.log('  Error getting vehicle by chip:', error.message);
  }

  try {
    // Method 2: Try to get vehicle by ISO-15118 identifier
    const isoId = 'ISO15118_ID_123';
    console.log('  ISO-15118 ID:', isoId);
    const vehicleHash2 = await vehicleRegistry.getVehicleByIso15118Identifier(isoId);
    console.log('  Vehicle Hash from ISO-15118:', vehicleHash2);
    
    if (vehicleHash2 !== ethers.ZeroHash) {
      const owner2 = await vehicleRegistry.ownerOfVehicle(vehicleHash2);
      console.log('  Owner of vehicle:', owner2);
    }
  } catch (error) {
    console.log('  Error getting vehicle by ISO-15118:', error.message);
  }

  // Let's try to find any vehicle that belongs to carOwner1
  console.log('\n🔍 Searching for vehicles owned by Car Owner 1...');
  
  // Try some common vehicle hashes that might be registered
  const testHashes = [
    ethers.keccak256(ethers.toUtf8Bytes('Vehicle 1')),
    ethers.keccak256(ethers.toUtf8Bytes('Vehicle 2')),
    ethers.keccak256(ethers.toUtf8Bytes('Vehicle 3')),
    ethers.keccak256(ethers.toUtf8Bytes('Tesla Model 3')),
    ethers.keccak256(ethers.toUtf8Bytes('BMW i3')),
  ];

  for (let i = 0; i < testHashes.length; i++) {
    try {
      const hash = testHashes[i];
      const owner = await vehicleRegistry.ownerOfVehicle(hash);
      if (owner !== ethers.ZeroAddress) {
        console.log(`  Found vehicle ${i + 1}:`, hash);
        console.log('    Owner:', owner);
        console.log('    Is Car Owner 1?', owner.toLowerCase() === carOwner1.address.toLowerCase());
        
        if (owner.toLowerCase() === carOwner1.address.toLowerCase()) {
          console.log('  ✅ This vehicle can be used for testing!');
          break;
        }
      }
    } catch (error) {
      // Vehicle doesn't exist, continue
    }
  }

  console.log('\n🎉 Debug completed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
