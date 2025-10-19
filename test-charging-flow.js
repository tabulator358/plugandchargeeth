#!/usr/bin/env node

/**
 * Test script to verify the charging session flow locally
 * This script tests the USDC approval and charging session creation
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('🧪 Testing Charging Session Flow...\n');

  // Get test accounts
  const [deployer, carOwner1, carOwner2, chargerOp1, chargerOp2] = await ethers.getSigners();
  
  console.log('👥 Test Accounts:');
  console.log('  Deployer:', deployer.address);
  console.log('  Car Owner 1:', carOwner1.address);
  console.log('  Car Owner 2:', carOwner2.address);
  console.log('  Charger Op 1:', chargerOp1.address);
  console.log('  Charger Op 2:', chargerOp2.address);
  console.log('');

  // Get deployed contracts
  const mockUSDC = await ethers.getContractAt('MockUSDC', '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  const vehicleRegistry = await ethers.getContractAt('VehicleRegistry', '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  const chargerRegistry = await ethers.getContractAt('ChargerRegistry', '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  const plugAndCharge = await ethers.getContractAt('PlugAndChargeCore', '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9');

  console.log('📄 Contract Addresses:');
  console.log('  MockUSDC:', await mockUSDC.getAddress());
  console.log('  VehicleRegistry:', await vehicleRegistry.getAddress());
  console.log('  ChargerRegistry:', await chargerRegistry.getAddress());
  console.log('  PlugAndChargeCore:', await plugAndCharge.getAddress());
  console.log('');

  // Test 1: Check USDC balances
  console.log('💰 USDC Balances:');
  const balance1 = await mockUSDC.balanceOf(carOwner1.address);
  const balance2 = await mockUSDC.balanceOf(carOwner2.address);
  console.log('  Car Owner 1:', ethers.formatUnits(balance1, 6), 'USDC');
  console.log('  Car Owner 2:', ethers.formatUnits(balance2, 6), 'USDC');
  console.log('');

  // Test 2: Check current allowance
  console.log('🔍 Current USDC Allowance:');
  const allowance1 = await mockUSDC.allowance(carOwner1.address, await plugAndCharge.getAddress());
  const allowance2 = await mockUSDC.allowance(carOwner2.address, await plugAndCharge.getAddress());
  console.log('  Car Owner 1 -> PlugAndCharge:', ethers.formatUnits(allowance1, 6), 'USDC');
  console.log('  Car Owner 2 -> PlugAndCharge:', ethers.formatUnits(allowance2, 6), 'USDC');
  console.log('');

  // Test 3: Approve USDC if needed
  if (allowance1 < ethers.parseUnits('100', 6)) {
    console.log('✅ Approving 100 USDC for Car Owner 1...');
    const approveTx = await mockUSDC.connect(carOwner1).approve(await plugAndCharge.getAddress(), ethers.parseUnits('100', 6));
    await approveTx.wait();
    console.log('  Transaction hash:', approveTx.hash);
  }

  if (allowance2 < ethers.parseUnits('100', 6)) {
    console.log('✅ Approving 100 USDC for Car Owner 2...');
    const approveTx = await mockUSDC.connect(carOwner2).approve(await plugAndCharge.getAddress(), ethers.parseUnits('100', 6));
    await approveTx.wait();
    console.log('  Transaction hash:', approveTx.hash);
  }
  console.log('');

  // Test 4: Get a vehicle hash for testing
  console.log('🚗 Getting Vehicle Hash for testing...');
  const vehicleHash = await vehicleRegistry.getVehicleByChip(ethers.keccak256(ethers.toUtf8Bytes('chip 31848912')));
  console.log('  Vehicle Hash:', vehicleHash);
  console.log('');

  // Test 5: Check if charger is trusted
  console.log('🤝 Checking trust relationship...');
  const isTrusted = await plugAndCharge.trustedChargers(carOwner1.address, 1);
  console.log('  Car Owner 1 trusts Charger 1:', isTrusted);
  console.log('');

  // Test 6: Try to create a charging session
  console.log('⚡ Testing charging session creation...');
  try {
    const sessionSalt = ethers.keccak256(ethers.randomBytes(32));
    const depositAmount = ethers.parseUnits('50', 6); // 50 USDC
    
    console.log('  Session Salt:', sessionSalt);
    console.log('  Deposit Amount:', ethers.formatUnits(depositAmount, 6), 'USDC');
    
    const createTx = await plugAndCharge.connect(carOwner1).createSession(
      vehicleHash,
      1, // charger ID
      sessionSalt,
      depositAmount,
      ethers.ZeroAddress, // no sponsor
      false, // no permit
      { value: 0, deadline: 0, v: 0, r: ethers.ZeroHash, s: ethers.ZeroHash }
    );
    
    const receipt = await createTx.wait();
    console.log('  ✅ Session created successfully!');
    console.log('  Transaction hash:', createTx.hash);
    console.log('  Gas used:', receipt.gasUsed.toString());
    
    // Get session ID from events
    const sessionCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = plugAndCharge.interface.parseLog(log);
        return parsed.name === 'SessionCreated';
      } catch {
        return false;
      }
    });
    
    if (sessionCreatedEvent) {
      const parsed = plugAndCharge.interface.parseLog(sessionCreatedEvent);
      const sessionId = parsed.args.sessionId;
      console.log('  Session ID:', sessionId.toString());
      
      // Get session details
      const session = await plugAndCharge.getSession(sessionId);
      console.log('  Session Details:');
      console.log('    Driver:', session.driver);
      console.log('    Charger ID:', session.chargerId.toString());
      console.log('    Reserved:', ethers.formatUnits(session.reserved, 6), 'USDC');
      console.log('    State:', session.state.toString());
    }
    
  } catch (error) {
    console.log('  ❌ Session creation failed:');
    console.log('  Error:', error.message);
    
    if (error.message.includes('ERC20InsufficientAllowance')) {
      console.log('  🔍 This is the USDC allowance issue!');
      console.log('  💡 Solution: Driver needs to approve USDC for PlugAndChargeCore contract');
    }
  }

  console.log('\n🎉 Test completed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
