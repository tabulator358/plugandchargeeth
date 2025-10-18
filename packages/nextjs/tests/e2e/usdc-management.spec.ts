import { test, expect } from '@playwright/test';
import { WalletHelper } from '../helpers/wallet';
import { TransactionHelper } from '../helpers/transactions';

test.describe('USDC Management', () => {
  test.beforeEach(async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    await page.goto('/usdc');
    await walletHelper.connectWallet();
  });

  test('should display USDC balance correctly', async ({ page }) => {
    // Check that balance is displayed
    const balanceElement = page.locator('[data-testid="usdc-balance"]').first();
    await expect(balanceElement).toBeVisible();
    
    // Balance should be a number
    const balanceText = await balanceElement.textContent();
    expect(balanceText).toMatch(/\d+/);
  });

  test('should display faucet usage correctly', async ({ page }) => {
    // Check that faucet usage is displayed
    const usageElement = page.locator('[data-testid="faucet-usage"]').first();
    await expect(usageElement).toBeVisible();
    
    // Usage should be a number
    const usageText = await usageElement.textContent();
    expect(usageText).toMatch(/\d+/);
  });

  test('should work with quick faucet button', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Get initial balance
    const initialBalanceElement = page.locator('[data-testid="usdc-balance"]').first();
    const initialBalance = await initialBalanceElement.textContent();
    const initialBalanceNum = parseInt(initialBalance?.replace(/[^\d]/g, '') || '0');
    
    // Click quick faucet button
    const quickFaucetButton = page.locator('text=Quick Faucet').first();
    await expect(quickFaucetButton).toBeVisible();
    await quickFaucetButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that balance increased
    const newBalanceElement = page.locator('[data-testid="usdc-balance"]').first();
    const newBalance = await newBalanceElement.textContent();
    const newBalanceNum = parseInt(newBalance?.replace(/[^\d]/g, '') || '0');
    
    expect(newBalanceNum).toBeGreaterThan(initialBalanceNum);
  });

  test('should work with custom faucet amount', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Get initial balance
    const initialBalanceElement = page.locator('[data-testid="usdc-balance"]').first();
    const initialBalance = await initialBalanceElement.textContent();
    const initialBalanceNum = parseInt(initialBalance?.replace(/[^\d]/g, '') || '0');
    
    // Enter custom amount
    const amountInput = page.locator('input[placeholder*="amount"]').first();
    await amountInput.fill('500');
    
    // Click custom faucet button
    const customFaucetButton = page.locator('text=Get USDC').first();
    await expect(customFaucetButton).toBeVisible();
    await customFaucetButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that balance increased by approximately 500
    const newBalanceElement = page.locator('[data-testid="usdc-balance"]').first();
    const newBalance = await newBalanceElement.textContent();
    const newBalanceNum = parseInt(newBalance?.replace(/[^\d]/g, '') || '0');
    
    expect(newBalanceNum).toBeGreaterThanOrEqual(initialBalanceNum + 500);
  });

  test('should handle faucet limit exceeded error', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Try to get a very large amount that exceeds the limit
    const amountInput = page.locator('input[placeholder*="amount"]').first();
    await amountInput.fill('20000'); // Exceeds 10,000 USDC limit
    
    // Click custom faucet button
    const customFaucetButton = page.locator('text=Get USDC').first();
    await customFaucetButton.click();
    
    // Should show error message
    const errorMessage = page.locator('text=Faucet limit exceeded').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should handle invalid amount input', async ({ page }) => {
    // Try to enter invalid amount
    const amountInput = page.locator('input[placeholder*="amount"]').first();
    await amountInput.fill('abc');
    
    // Button should be disabled or show validation error
    const customFaucetButton = page.locator('text=Get USDC').first();
    
    // Either button should be disabled or there should be validation error
    const isDisabled = await customFaucetButton.isDisabled();
    const hasValidationError = await page.locator('text=Invalid amount').isVisible();
    
    expect(isDisabled || hasValidationError).toBe(true);
  });

  test('should handle zero amount input', async ({ page }) => {
    // Enter zero amount
    const amountInput = page.locator('input[placeholder*="amount"]').first();
    await amountInput.fill('0');
    
    // Click custom faucet button
    const customFaucetButton = page.locator('text=Get USDC').first();
    await customFaucetButton.click();
    
    // Should handle zero amount gracefully (either succeed or show error)
    await page.waitForTimeout(3000);
    
    // Check for any error messages
    const errorMessages = page.locator('[data-testid="error-message"]');
    const errorCount = await errorMessages.count();
    
    // Should not have unexpected errors
    expect(errorCount).toBeLessThanOrEqual(1);
  });

  test('should update faucet usage after successful faucet', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Get initial faucet usage
    const initialUsageElement = page.locator('[data-testid="faucet-usage"]').first();
    const initialUsage = await initialUsageElement.textContent();
    const initialUsageNum = parseInt(initialUsage?.replace(/[^\d]/g, '') || '0');
    
    // Use quick faucet
    const quickFaucetButton = page.locator('text=Quick Faucet').first();
    await quickFaucetButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that faucet usage increased
    const newUsageElement = page.locator('[data-testid="faucet-usage"]').first();
    const newUsage = await newUsageElement.textContent();
    const newUsageNum = parseInt(newUsage?.replace(/[^\d]/g, '') || '0');
    
    expect(newUsageNum).toBeGreaterThan(initialUsageNum);
  });

  test('should show loading state during faucet transaction', async ({ page }) => {
    // Click quick faucet button
    const quickFaucetButton = page.locator('text=Quick Faucet').first();
    await quickFaucetButton.click();
    
    // Should show loading state
    const loadingIndicator = page.locator('[data-testid="loading"]').first();
    await expect(loadingIndicator).toBeVisible({ timeout: 5000 });
    
    // Wait for loading to complete
    await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network error by going offline
    await page.context().setOffline(true);
    
    // Try to use faucet
    const quickFaucetButton = page.locator('text=Quick Faucet').first();
    await quickFaucetButton.click();
    
    // Should show network error
    const errorMessage = page.locator('text=Network error').or(page.locator('text=Failed to connect')).first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Go back online
    await page.context().setOffline(false);
  });
});
