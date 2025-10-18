import { test, expect } from '@playwright/test';
import { WalletHelper } from '../helpers/wallet';
import { TransactionHelper } from '../helpers/transactions';

test.describe('Plug and Charge Page', () => {
  test.beforeEach(async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    await page.goto('/plug-and-charge');
    await walletHelper.connectWallet();
  });

  test('should display all tabs correctly', async ({ page }) => {
    // Check that all tabs are visible
    await expect(page.locator('text=Charger Management')).toBeVisible();
    await expect(page.locator('text=Vehicle Management')).toBeVisible();
    await expect(page.locator('text=Session Management')).toBeVisible();
    await expect(page.locator('text=Owner Dashboard')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Test switching to Vehicle Management tab
    await page.locator('text=Vehicle Management').click();
    await expect(page.locator('[data-testid="vehicle-management"]')).toBeVisible();
    
    // Test switching to Charger Management tab
    await page.locator('text=Charger Management').click();
    await expect(page.locator('[data-testid="charger-management"]')).toBeVisible();
    
    // Test switching to Session Management tab
    await page.locator('text=Session Management').click();
    await expect(page.locator('[data-testid="session-management"]')).toBeVisible();
    
    // Test switching to Owner Dashboard tab
    await page.locator('text=Owner Dashboard').click();
    await expect(page.locator('[data-testid="owner-dashboard"]')).toBeVisible();
  });

  test('should register vehicle in Vehicle Management tab', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Switch to Vehicle Management tab
    await page.locator('text=Vehicle Management').click();
    
    // Fill vehicle registration form
    const vehicleNameInput = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput.fill('Tesla Model 3');
    
    const chipIdInput = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput.fill('CHIP123456789');
    
    const publicKeyInput = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput.fill('0x1234abcd...');
    
    // Submit form
    const registerButton = page.locator('text=Register Vehicle').first();
    await expect(registerButton).toBeVisible();
    await registerButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that vehicle appears in list
    const vehicleList = page.locator('[data-testid="vehicle-list"]').first();
    await expect(vehicleList).toContainText('Tesla Model 3');
  });

  test('should unregister vehicle', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Switch to Vehicle Management tab
    await page.locator('text=Vehicle Management').click();
    
    // First register a vehicle
    const vehicleNameInput = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput.fill('BMW i3');
    
    const chipIdInput = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput.fill('CHIP987654321');
    
    const publicKeyInput = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput.fill('0x5678efgh...');
    
    const registerButton = page.locator('text=Register Vehicle').first();
    await registerButton.click();
    await transactionHelper.waitForTransaction();
    
    // Now unregister it
    const unregisterButton = page.locator('text=Unregister Vehicle').first();
    await expect(unregisterButton).toBeVisible();
    await unregisterButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that vehicle is removed from list
    const vehicleList = page.locator('[data-testid="vehicle-list"]').first();
    await expect(vehicleList).not.toContainText('BMW i3');
  });

  test('should check vehicle owner', async ({ page }) => {
    // Switch to Vehicle Management tab
    await page.locator('text=Vehicle Management').click();
    
    // Enter vehicle hash to check
    const vehicleHashInput = page.locator('input[placeholder*="Vehicle Hash"]').first();
    await vehicleHashInput.fill('0x1234567890123456789012345678901234567890123456789012345678901234');
    
    // Click check button
    const checkButton = page.locator('text=Check Owner').first();
    await expect(checkButton).toBeVisible();
    await checkButton.click();
    
    // Should show owner information
    const ownerInfo = page.locator('[data-testid="owner-info"]').first();
    await expect(ownerInfo).toBeVisible();
  });

  test('should register charger in Charger Management tab', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Switch to Charger Management tab
    await page.locator('text=Charger Management').click();
    
    // Fill charger registration form
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('6');
    
    const ownerInput = page.locator('input[placeholder*="Owner"]').first();
    await ownerInput.fill('0x1234567890123456789012345678901234567890');
    
    const latInput = page.locator('input[placeholder*="Latitude"]').first();
    await latInput.fill('50.0');
    
    const lngInput = page.locator('input[placeholder*="Longitude"]').first();
    await lngInput.fill('14.0');
    
    const priceInput = page.locator('input[placeholder*="Price per kWh"]').first();
    await priceInput.fill('300');
    
    const powerInput = page.locator('input[placeholder*="Power (kW)"]').first();
    await powerInput.fill('50');
    
    // Submit form
    const registerButton = page.locator('text=Register Charger').first();
    await expect(registerButton).toBeVisible();
    await registerButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that charger appears in list
    const chargerList = page.locator('[data-testid="charger-list"]').first();
    await expect(chargerList).toContainText('6');
  });

  test('should update charger details', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Switch to Charger Management tab
    await page.locator('text=Charger Management').click();
    
    // First register a charger
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('7');
    
    const ownerInput = page.locator('input[placeholder*="Owner"]').first();
    await ownerInput.fill('0x1234567890123456789012345678901234567890');
    
    const latInput = page.locator('input[placeholder*="Latitude"]').first();
    await latInput.fill('50.0');
    
    const lngInput = page.locator('input[placeholder*="Longitude"]').first();
    await lngInput.fill('14.0');
    
    const priceInput = page.locator('input[placeholder*="Price per kWh"]').first();
    await priceInput.fill('300');
    
    const powerInput = page.locator('input[placeholder*="Power (kW)"]').first();
    await powerInput.fill('50');
    
    const registerButton = page.locator('text=Register Charger').first();
    await registerButton.click();
    await transactionHelper.waitForTransaction();
    
    // Now update the charger
    const updateChargerIdInput = page.locator('input[placeholder*="Charger ID to Update"]').first();
    await updateChargerIdInput.fill('7');
    
    const newPriceInput = page.locator('input[placeholder*="New Price"]').first();
    await newPriceInput.fill('350');
    
    const updateButton = page.locator('text=Update Charger').first();
    await expect(updateButton).toBeVisible();
    await updateButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that charger was updated
    const chargerList = page.locator('[data-testid="charger-list"]').first();
    await expect(chargerList).toContainText('350');
  });

  test('should activate/deactivate charger', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Switch to Charger Management tab
    await page.locator('text=Charger Management').click();
    
    // First register a charger
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('8');
    
    const ownerInput = page.locator('input[placeholder*="Owner"]').first();
    await ownerInput.fill('0x1234567890123456789012345678901234567890');
    
    const latInput = page.locator('input[placeholder*="Latitude"]').first();
    await latInput.fill('50.0');
    
    const lngInput = page.locator('input[placeholder*="Longitude"]').first();
    await lngInput.fill('14.0');
    
    const priceInput = page.locator('input[placeholder*="Price per kWh"]').first();
    await priceInput.fill('300');
    
    const powerInput = page.locator('input[placeholder*="Power (kW)"]').first();
    await powerInput.fill('50');
    
    const registerButton = page.locator('text=Register Charger').first();
    await registerButton.click();
    await transactionHelper.waitForTransaction();
    
    // Deactivate charger
    const deactivateChargerIdInput = page.locator('input[placeholder*="Charger ID to Deactivate"]').first();
    await deactivateChargerIdInput.fill('8');
    
    const deactivateButton = page.locator('text=Deactivate Charger').first();
    await expect(deactivateButton).toBeVisible();
    await deactivateButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Activate charger again
    const activateChargerIdInput = page.locator('input[placeholder*="Charger ID to Activate"]').first();
    await activateChargerIdInput.fill('8');
    
    const activateButton = page.locator('text=Activate Charger').first();
    await expect(activateButton).toBeVisible();
    await activateButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
  });

  test('should check charger details', async ({ page }) => {
    // Switch to Charger Management tab
    await page.locator('text=Charger Management').click();
    
    // Enter charger ID to check
    const chargerIdInput = page.locator('input[placeholder*="Charger ID to Check"]').first();
    await chargerIdInput.fill('1');
    
    // Click check button
    const checkButton = page.locator('text=Check Charger').first();
    await expect(checkButton).toBeVisible();
    await checkButton.click();
    
    // Should show charger information
    const chargerInfo = page.locator('[data-testid="charger-info"]').first();
    await expect(chargerInfo).toBeVisible();
  });

  test('should create charging session in Session Management tab', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Switch to Session Management tab
    await page.locator('text=Session Management').click();
    
    // Fill session creation form
    const vehicleHashInput = page.locator('input[placeholder*="Vehicle Hash"]').first();
    await vehicleHashInput.fill('0x1234567890123456789012345678901234567890123456789012345678901234');
    
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('1');
    
    const sessionSaltInput = page.locator('input[placeholder*="Session Salt"]').first();
    await sessionSaltInput.fill('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    
    const depositInput = page.locator('input[placeholder*="Initial Deposit"]').first();
    await depositInput.fill('50');
    
    // Submit form
    const createButton = page.locator('text=Create Session').first();
    await expect(createButton).toBeVisible();
    await createButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that session was created
    const sessionInfo = page.locator('[data-testid="session-info"]').first();
    await expect(sessionInfo).toBeVisible();
  });

  test('should set trusted charger', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Switch to Session Management tab
    await page.locator('text=Session Management').click();
    
    // Fill trusted charger form
    const chargerIdInput = page.locator('input[placeholder*="Charger ID to Trust"]').first();
    await chargerIdInput.fill('1');
    
    // Submit form
    const trustButton = page.locator('text=Set Trusted Charger').first();
    await expect(trustButton).toBeVisible();
    await trustButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that charger is now trusted
    const trustedInfo = page.locator('[data-testid="trusted-info"]').first();
    await expect(trustedInfo).toBeVisible();
  });

  test('should check session details', async ({ page }) => {
    // Switch to Session Management tab
    await page.locator('text=Session Management').click();
    
    // Enter session ID to check
    const sessionIdInput = page.locator('input[placeholder*="Session ID"]').first();
    await sessionIdInput.fill('1');
    
    // Click check button
    const checkButton = page.locator('text=Check Session').first();
    await expect(checkButton).toBeVisible();
    await checkButton.click();
    
    // Should show session information
    const sessionInfo = page.locator('[data-testid="session-info"]').first();
    await expect(sessionInfo).toBeVisible();
  });

  test('should display USDC management in Owner Dashboard', async ({ page }) => {
    // Switch to Owner Dashboard tab
    await page.locator('text=Owner Dashboard').click();
    
    // Check that USDC management section is visible
    const usdcManagement = page.locator('[data-testid="usdc-management"]').first();
    await expect(usdcManagement).toBeVisible();
    
    // Check for USDC balance
    await expect(usdcManagement).toContainText('USDC Balance');
    
    // Check for faucet functionality
    await expect(usdcManagement).toContainText('Faucet');
  });

  test('should handle form validation across all tabs', async ({ page }) => {
    // Test Vehicle Management tab validation
    await page.locator('text=Vehicle Management').click();
    
    const registerButton = page.locator('text=Register Vehicle').first();
    await registerButton.click();
    
    // Should show validation errors
    const errorMessages = page.locator('[data-testid="validation-error"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
    
    // Test Charger Management tab validation
    await page.locator('text=Charger Management').click();
    
    const registerChargerButton = page.locator('text=Register Charger').first();
    await registerChargerButton.click();
    
    // Should show validation errors
    const chargerErrorMessages = page.locator('[data-testid="validation-error"]');
    const chargerErrorCount = await chargerErrorMessages.count();
    expect(chargerErrorCount).toBeGreaterThan(0);
  });

  test('should maintain state when switching tabs', async ({ page }) => {
    // Fill form in Vehicle Management tab
    await page.locator('text=Vehicle Management').click();
    
    const vehicleNameInput = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput.fill('Tesla Model 3');
    
    // Switch to another tab
    await page.locator('text=Charger Management').click();
    
    // Switch back to Vehicle Management
    await page.locator('text=Vehicle Management').click();
    
    // Form should still have the value
    await expect(vehicleNameInput).toHaveValue('Tesla Model 3');
  });
});
