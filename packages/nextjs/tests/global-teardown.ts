import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');
  
  // Clean up any resources if needed
  console.log('✅ Global teardown completed');
}

export default globalTeardown;
