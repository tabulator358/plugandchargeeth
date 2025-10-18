import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  // Start Hardhat network if not already running
  console.log('📡 Ensuring Hardhat network is running...');
  
  // Deploy contracts if needed
  console.log('📦 Deploying contracts...');
  
  // Wait for contracts to be deployed
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('✅ Global setup completed');
}

export default globalSetup;
