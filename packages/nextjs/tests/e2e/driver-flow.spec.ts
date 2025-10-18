import { test, expect } from '@playwright/test';
import { WalletHelper } from '../helpers/wallet';
import { TransactionHelper } from '../helpers/transactions';

test.describe('Driver Flow', () => {
  test.beforeEach(async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    await page.goto('/driver');
    await walletHelper.connectWallet();
  });

  test('should display USDC balance and allowance', async ({ page }) => {
    // Check that USDC balance is displayed
    const balanceElement = page.locator('[data-testid="usdc-balance"]').first();
    await expect(balanceElement).toBeVisible();
    
    // Check that allowance is displayed
    const allowanceElement = page.locator('[data-testid="usdc-allowance"]').first();
    await expect(allowanceElement).toBeVisible();
  });

  test('should approve USDC for contract', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Click approve button
    const approveButton = page.locator('text=Approve USDC').first();
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that allowance increased
    const allowanceElement = page.locator('[data-testid="usdc-allowance"]').first();
    await expect(allowanceElement).toContainText(/[1-9]/); // Should be greater than 0
  });

  test('should register vehicle with all fields', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Fill vehicle registration form
    const vehicleNameInput = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput.fill('Tesla Model 3');
    
    const chipIdInput = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput.fill('CHIP123456789');
    
    // Enable ISO 15118
    const iso15118Checkbox = page.locator('input[type="checkbox"]').first();
    await iso15118Checkbox.check();
    
    const publicKeyInput = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput.fill('0x1234abcd...');
    
    // Submit form
    const submitButton = page.locator('text=Register Vehicle').first();
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that vehicle appears in list
    const vehicleList = page.locator('[data-testid="vehicle-list"]').first();
    await expect(vehicleList).toContainText('Tesla Model 3');
  });

  test('should register vehicle without ISO 15118', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Fill vehicle registration form
    const vehicleNameInput = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput.fill('BMW i3');
    
    const chipIdInput = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput.fill('CHIP987654321');
    
    // Don't enable ISO 15118 (leave checkbox unchecked)
    
    const publicKeyInput = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput.fill('0x5678efgh...');
    
    // Submit form
    const submitButton = page.locator('text=Register Vehicle').first();
    await submitButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that vehicle appears in list
    const vehicleList = page.locator('[data-testid="vehicle-list"]').first();
    await expect(vehicleList).toContainText('BMW i3');
  });

  test('should add trusted charger by ID', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Fill trusted charger form
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('1');
    
    // Submit form
    const addButton = page.locator('text=Add Trusted Charger').first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that charger appears in trusted list
    const trustedList = page.locator('[data-testid="trusted-chargers-list"]').first();
    await expect(trustedList).toContainText('1');
  });

  test('should remove trusted charger', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // First add a trusted charger
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('1');
    
    const addButton = page.locator('text=Add Trusted Charger').first();
    await addButton.click();
    await transactionHelper.waitForTransaction();
    
    // Now remove it
    const removeButton = page.locator('text=Remove').first();
    await expect(removeButton).toBeVisible();
    await removeButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that charger is removed from list
    const trustedList = page.locator('[data-testid="trusted-chargers-list"]').first();
    await expect(trustedList).not.toContainText('1');
  });

  test('should create charging session', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // First register a vehicle
    const vehicleNameInput = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput.fill('Tesla Model 3');
    
    const chipIdInput = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput.fill('CHIP123456789');
    
    const publicKeyInput = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput.fill('0x1234abcd...');
    
    const submitButton = page.locator('text=Register Vehicle').first();
    await submitButton.click();
    await transactionHelper.waitForTransaction();
    
    // Now create a charging session
    const sessionForm = page.locator('[data-testid="session-form"]').first();
    await expect(sessionForm).toBeVisible();
    
    // Select vehicle
    const vehicleSelect = page.locator('select').first();
    await vehicleSelect.selectOption('Tesla Model 3');
    
    // Enter charger ID
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').nth(1);
    await chargerIdInput.fill('1');
    
    // Enter initial deposit
    const depositInput = page.locator('input[placeholder*="Initial Deposit"]').first();
    await depositInput.fill('50');
    
    // Submit session
    const createSessionButton = page.locator('text=Start Charging Session').first();
    await expect(createSessionButton).toBeVisible();
    await createSessionButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that session appears in active sessions
    const activeSessions = page.locator('[data-testid="active-sessions"]').first();
    await expect(activeSessions).toBeVisible();
  });

  test('should view active sessions', async ({ page }) => {
    // Check that active sessions section is visible
    const activeSessions = page.locator('[data-testid="active-sessions"]').first();
    await expect(activeSessions).toBeVisible();
    
    // Should show session details if any exist
    const sessionDetails = page.locator('[data-testid="session-details"]');
    const sessionCount = await sessionDetails.count();
    
    if (sessionCount > 0) {
      // Check that session details are displayed
      await expect(sessionDetails.first()).toBeVisible();
    }
  });

  test('should view session history', async ({ page }) => {
    // Check that session history section is visible
    const sessionHistory = page.locator('[data-testid="session-history"]').first();
    await expect(sessionHistory).toBeVisible();
    
    // Should show historical sessions if any exist
    const historyItems = page.locator('[data-testid="history-item"]');
    const historyCount = await historyItems.count();
    
    if (historyCount > 0) {
      // Check that history items are displayed
      await expect(historyItems.first()).toBeVisible();
    }
  });

  test('should handle form validation errors', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.locator('text=Register Vehicle').first();
    await submitButton.click();
    
    // Should show validation errors
    const errorMessages = page.locator('[data-testid="validation-error"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should handle insufficient USDC balance', async ({ page }) => {
    // Try to create session with very high deposit
    const depositInput = page.locator('input[placeholder*="Initial Deposit"]').first();
    await depositInput.fill('999999');
    
    const createSessionButton = page.locator('text=Start Charging Session').first();
    await createSessionButton.click();
    
    // Should show insufficient balance error
    const errorMessage = page.locator('text=Insufficient balance').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });
});
