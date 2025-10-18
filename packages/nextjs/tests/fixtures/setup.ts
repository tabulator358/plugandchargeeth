import { test as base, expect } from '@playwright/test';

// Extend basic test by providing wallet connection functionality
export const test = base.extend<{
  connectedPage: any;
}>({
  connectedPage: async ({ page }, use) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Connect wallet (assuming MetaMask or similar)
    const connectButton = page.locator('text=Connect Wallet').first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      
      // Wait for wallet connection modal
      await page.waitForSelector('[data-testid="wallet-connection-modal"]', { timeout: 10000 });
      
      // Select MetaMask or first available wallet
      const metamaskButton = page.locator('text=MetaMask').first();
      if (await metamaskButton.isVisible()) {
        await metamaskButton.click();
      }
      
      // Wait for connection to complete
      await page.waitForSelector('text=Connected', { timeout: 15000 });
    }
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
