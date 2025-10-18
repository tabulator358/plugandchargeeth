import { test, expect } from '@playwright/test';
import { WalletHelper } from '../helpers/wallet';

test.describe('Wallet Connection', () => {
  test('should connect wallet successfully', async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    
    await page.goto('/');
    
    // Initially wallet should not be connected
    expect(await walletHelper.isConnected()).toBe(false);
    
    // Connect wallet
    await walletHelper.connectWallet();
    
    // Wallet should now be connected
    expect(await walletHelper.isConnected()).toBe(true);
    
    // Should show wallet address
    const address = await walletHelper.getWalletAddress();
    expect(address).toBeTruthy();
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test('should disconnect wallet successfully', async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    
    await page.goto('/');
    
    // Connect wallet first
    await walletHelper.connectWallet();
    expect(await walletHelper.isConnected()).toBe(true);
    
    // Disconnect wallet
    await walletHelper.disconnectWallet();
    
    // Wallet should now be disconnected
    expect(await walletHelper.isConnected()).toBe(false);
  });

  test('should handle wallet connection errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Try to connect wallet
    const connectButton = page.locator('text=Connect Wallet').first();
    await connectButton.click();
    
    // If connection fails, should show error message
    const errorMessage = page.locator('text=Failed to connect wallet').first();
    
    // Wait a bit to see if error appears
    await page.waitForTimeout(5000);
    
    // If error appears, it should be dismissible
    if (await errorMessage.isVisible()) {
      const dismissButton = page.locator('text=Dismiss').first();
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
      }
    }
  });

  test('should maintain connection across page navigation', async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    
    await page.goto('/');
    
    // Connect wallet
    await walletHelper.connectWallet();
    expect(await walletHelper.isConnected()).toBe(true);
    
    // Navigate to different page
    await page.goto('/driver');
    await page.waitForLoadState('networkidle');
    
    // Wallet should still be connected
    expect(await walletHelper.isConnected()).toBe(true);
    
    // Navigate to another page
    await page.goto('/charger');
    await page.waitForLoadState('networkidle');
    
    // Wallet should still be connected
    expect(await walletHelper.isConnected()).toBe(true);
  });

  test('should show correct network information', async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    
    await page.goto('/');
    
    // Connect wallet
    await walletHelper.connectWallet();
    
    // Should show network information (Localhost or Hardhat)
    const networkInfo = page.locator('text=Localhost').or(page.locator('text=Hardhat')).first();
    await expect(networkInfo).toBeVisible();
  });

  test('should handle wallet connection modal properly', async ({ page }) => {
    await page.goto('/');
    
    // Click connect wallet button
    const connectButton = page.locator('text=Connect Wallet').first();
    await connectButton.click();
    
    // Modal should appear
    const modal = page.locator('[data-testid="wallet-connection-modal"]').first();
    await expect(modal).toBeVisible();
    
    // Should have wallet options
    const walletOptions = page.locator('[data-testid="wallet-option"]');
    const optionCount = await walletOptions.count();
    expect(optionCount).toBeGreaterThan(0);
    
    // Should have close button
    const closeButton = page.locator('[data-testid="close-modal"]').first();
    await expect(closeButton).toBeVisible();
    
    // Close modal
    await closeButton.click();
    
    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test('should handle multiple wallet connection attempts', async ({ page }) => {
    await page.goto('/');
    
    // Try to connect multiple times
    for (let i = 0; i < 3; i++) {
      const connectButton = page.locator('text=Connect Wallet').first();
      
      if (await connectButton.isVisible()) {
        await connectButton.click();
        
        // Wait for modal or connection
        await page.waitForTimeout(2000);
        
        // If modal is open, close it
        const modal = page.locator('[data-testid="wallet-connection-modal"]').first();
        if (await modal.isVisible()) {
          const closeButton = page.locator('[data-testid="close-modal"]').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        }
      }
    }
    
    // Should not have any errors
    const errorMessages = page.locator('[data-testid="error-message"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });
});
