#!/usr/bin/env node

const { ethers } = require('hardhat');

async function main() {
  console.log('🧪 Testing with Real Vehicle Data...\n');

  // Get test accounts
  const [deployer, carOwner1, carOwner2, chargerOp1, chargerOp2] = await ethers.getSigners();
  
  // Get deployed contracts
  const mockUSDC = await ethers.getContractAt('MockUSDC', '0x5FbDB2315678afecb367f032d93F642f64180aa3');
  const vehicleRegistry = await ethers.getContractAt('VehicleRegistry', '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  const plugAndCharge = await ethers.getContractAt('PlugAndChargeCore', '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9');

  console.log('🚗 Creating a test vehicle...');
  
  // Create vehicle data like in the deployment script
  const vehicleData = 'Tesla-Model S-2020-0';
  const vehicleHash = ethers.keccak256(ethers.toUtf8Bytes(vehicleData));
  
  const chipData = `CHIP-0-${carOwner1.address.slice(0, 8)}`;
  const chipId = ethers.keccak256(ethers.toUtf8Bytes(chipData));
  
  const publicKeyData = `PK-${vehicleData}-${Date.now()}`;
  const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes(publicKeyData));
  
  console.log('  Vehicle Data:', vehicleData);
  console.log('  Vehicle Hash:', vehicleHash);
  console.log('  Chip ID:', chipId);
  console.log('  Public Key Hash:', publicKeyHash);
  
  // Register the vehicle
  try {
    const registerTx = await vehicleRegistry.connect(carOwner1).registerVehicle(
      vehicleHash,
      chipId,
      true, // ISO 15118 enabled
      publicKeyHash,
      'ISO-15118-1' // ISO 15118 identifier
    );
    await registerTx.wait();
    console.log('  ✅ Vehicle registered successfully!');
    console.log('  Transaction hash:', registerTx.hash);
  } catch (error) {
    console.log('  ⚠️ Vehicle might already be registered:', error.message);
  }
  
  // Verify vehicle registration
  const owner = await vehicleRegistry.ownerOfVehicle(vehicleHash);
  console.log('  Vehicle owner:', owner);
  console.log('  Is Car Owner 1?', owner.toLowerCase() === carOwner1.address.toLowerCase());
  
  console.log('\n💰 Checking USDC allowance...');
  const allowance = await mockUSDC.allowance(carOwner1.address, await plugAndCharge.getAddress());
  console.log('  Current allowance:', ethers.formatUnits(allowance, 6), 'USDC');
  
  if (allowance < ethers.parseUnits('100', 6)) {
    console.log('  ✅ Approving 100 USDC...');
    const approveTx = await mockUSDC.connect(carOwner1).approve(await plugAndCharge.getAddress(), ethers.parseUnits('100', 6));
    await approveTx.wait();
    console.log('  Transaction hash:', approveTx.hash);
  }
  
  console.log('\n⚡ Testing charging session creation...');
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
    } else if (error.message.includes('ErrNotRegistered')) {
      console.log('  🔍 Vehicle not registered issue!');
    } else if (error.message.includes('ErrNotTrusted')) {
      console.log('  🔍 Trust relationship issue!');
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
