import { test, expect } from '@playwright/test';
import { WalletHelper } from '../helpers/wallet';
import { TransactionHelper } from '../helpers/transactions';

test.describe('Charger Operator Flow', () => {
  test.beforeEach(async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    await page.goto('/charger');
    await walletHelper.connectWallet();
  });

  test('should display owned chargers list', async ({ page }) => {
    // Check that owned chargers section is visible
    const ownedChargers = page.locator('[data-testid="owned-chargers"]').first();
    await expect(ownedChargers).toBeVisible();
    
    // Should show charger details if any exist
    const chargerItems = page.locator('[data-testid="charger-item"]');
    const chargerCount = await chargerItems.count();
    
    if (chargerCount > 0) {
      // Check that charger details are displayed
      await expect(chargerItems.first()).toBeVisible();
    }
  });

  test('should register new charger', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Fill charger registration form
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('3');
    
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
    
    // Check that charger appears in owned chargers list
    const ownedChargers = page.locator('[data-testid="owned-chargers"]').first();
    await expect(ownedChargers).toContainText('3');
  });

  test('should update charger details', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // First register a charger
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('4');
    
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
    const editButton = page.locator('text=Edit').first();
    await expect(editButton).toBeVisible();
    await editButton.click();
    
    // Update price
    const newPriceInput = page.locator('input[placeholder*="New Price"]').first();
    await newPriceInput.fill('350');
    
    // Submit update
    const updateButton = page.locator('text=Update Charger').first();
    await expect(updateButton).toBeVisible();
    await updateButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that price was updated
    const ownedChargers = page.locator('[data-testid="owned-chargers"]').first();
    await expect(ownedChargers).toContainText('350');
  });

  test('should activate/deactivate charger', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // First register a charger
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('5');
    
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
    const deactivateButton = page.locator('text=Deactivate').first();
    await expect(deactivateButton).toBeVisible();
    await deactivateButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that charger is deactivated
    const ownedChargers = page.locator('[data-testid="owned-chargers"]').first();
    await expect(ownedChargers).toContainText('Inactive');
    
    // Activate charger again
    const activateButton = page.locator('text=Activate').first();
    await expect(activateButton).toBeVisible();
    await activateButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that charger is active
    await expect(ownedChargers).toContainText('Active');
  });

  test('should start trusted driver session', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Fill session form for trusted driver
    const sessionForm = page.locator('[data-testid="session-form"]').first();
    await expect(sessionForm).toBeVisible();
    
    // Select trusted driver mode
    const trustedDriverRadio = page.locator('input[value="trusted"]').first();
    await trustedDriverRadio.check();
    
    // Fill form fields
    const vehicleHashInput = page.locator('input[placeholder*="Vehicle Hash"]').first();
    await vehicleHashInput.fill('0x1234567890123456789012345678901234567890123456789012345678901234');
    
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').nth(1);
    await chargerIdInput.fill('1');
    
    const sessionSaltInput = page.locator('input[placeholder*="Session Salt"]').first();
    await sessionSaltInput.fill('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    
    const payerInput = page.locator('input[placeholder*="Payer Address"]').first();
    await payerInput.fill('0x1234567890123456789012345678901234567890');
    
    const depositInput = page.locator('input[placeholder*="Initial Deposit"]').nth(1);
    await depositInput.fill('50');
    
    // Submit session
    const startSessionButton = page.locator('text=Start Session').first();
    await expect(startSessionButton).toBeVisible();
    await startSessionButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that session appears in active sessions
    const activeSessions = page.locator('[data-testid="active-sessions"]').first();
    await expect(activeSessions).toBeVisible();
  });

  test('should start guest session', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // Fill session form for guest
    const sessionForm = page.locator('[data-testid="session-form"]').first();
    await expect(sessionForm).toBeVisible();
    
    // Select guest mode
    const guestRadio = page.locator('input[value="guest"]').first();
    await guestRadio.check();
    
    // Fill form fields
    const vehicleHashInput = page.locator('input[placeholder*="Vehicle Hash"]').first();
    await vehicleHashInput.fill('0x1234567890123456789012345678901234567890123456789012345678901234');
    
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').nth(1);
    await chargerIdInput.fill('1');
    
    const sessionSaltInput = page.locator('input[placeholder*="Session Salt"]').first();
    await sessionSaltInput.fill('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    
    const payerInput = page.locator('input[placeholder*="Payer Address"]').first();
    await payerInput.fill('0x1234567890123456789012345678901234567890');
    
    const depositInput = page.locator('input[placeholder*="Initial Deposit"]').nth(1);
    await depositInput.fill('50');
    
    // Submit session
    const startSessionButton = page.locator('text=Start Session').first();
    await startSessionButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that session appears in active sessions
    const activeSessions = page.locator('[data-testid="active-sessions"]').first();
    await expect(activeSessions).toBeVisible();
  });

  test('should view active sessions on chargers', async ({ page }) => {
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

  test('should end session and propose charge', async ({ page }) => {
    const transactionHelper = new TransactionHelper(page);
    
    // First create a session (simplified for testing)
    const sessionForm = page.locator('[data-testid="session-form"]').first();
    await expect(sessionForm).toBeVisible();
    
    const trustedDriverRadio = page.locator('input[value="trusted"]').first();
    await trustedDriverRadio.check();
    
    const vehicleHashInput = page.locator('input[placeholder*="Vehicle Hash"]').first();
    await vehicleHashInput.fill('0x1234567890123456789012345678901234567890123456789012345678901234');
    
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').nth(1);
    await chargerIdInput.fill('1');
    
    const sessionSaltInput = page.locator('input[placeholder*="Session Salt"]').first();
    await sessionSaltInput.fill('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    
    const payerInput = page.locator('input[placeholder*="Payer Address"]').first();
    await payerInput.fill('0x1234567890123456789012345678901234567890');
    
    const depositInput = page.locator('input[placeholder*="Initial Deposit"]').nth(1);
    await depositInput.fill('50');
    
    const startSessionButton = page.locator('text=Start Session').first();
    await startSessionButton.click();
    await transactionHelper.waitForTransaction();
    
    // Now end the session and propose charge
    const endSessionButton = page.locator('text=End Session').first();
    await expect(endSessionButton).toBeVisible();
    await endSessionButton.click();
    
    // Enter proposed charge amount
    const chargeInput = page.locator('input[placeholder*="Proposed Charge"]').first();
    await chargeInput.fill('30');
    
    // Submit proposal
    const proposeButton = page.locator('text=Propose Charge').first();
    await expect(proposeButton).toBeVisible();
    await proposeButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that session state changed
    const sessionDetails = page.locator('[data-testid="session-details"]').first();
    await expect(sessionDetails).toContainText('Proposed');
  });

  test('should handle form validation errors', async ({ page }) => {
    // Try to submit empty charger registration form
    const registerButton = page.locator('text=Register Charger').first();
    await registerButton.click();
    
    // Should show validation errors
    const errorMessages = page.locator('[data-testid="validation-error"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should handle invalid charger ID', async ({ page }) => {
    // Try to register charger with invalid ID
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('abc');
    
    const registerButton = page.locator('text=Register Charger').first();
    await registerButton.click();
    
    // Should show validation error
    const errorMessage = page.locator('text=Invalid charger ID').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });
});
