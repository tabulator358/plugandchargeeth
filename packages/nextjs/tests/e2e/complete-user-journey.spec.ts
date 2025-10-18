import { test, expect } from '@playwright/test';
import { WalletHelper } from '../helpers/wallet';
import { TransactionHelper } from '../helpers/transactions';

test.describe('Complete User Journey', () => {
  test('should complete full driver journey from start to finish', async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    const transactionHelper = new TransactionHelper(page);
    
    // Step 1: Connect wallet
    await page.goto('/');
    await walletHelper.connectWallet();
    expect(await walletHelper.isConnected()).toBe(true);
    
    // Step 2: Get USDC from faucet
    await page.goto('/usdc');
    
    // Get initial balance
    const initialBalanceElement = page.locator('[data-testid="usdc-balance"]').first();
    const initialBalance = await initialBalanceElement.textContent();
    const initialBalanceNum = parseInt(initialBalance?.replace(/[^\d]/g, '') || '0');
    
    // Use quick faucet
    const quickFaucetButton = page.locator('text=Quick Faucet').first();
    await quickFaucetButton.click();
    await transactionHelper.waitForTransaction();
    
    // Verify balance increased
    const newBalanceElement = page.locator('[data-testid="usdc-balance"]').first();
    const newBalance = await newBalanceElement.textContent();
    const newBalanceNum = parseInt(newBalance?.replace(/[^\d]/g, '') || '0');
    expect(newBalanceNum).toBeGreaterThan(initialBalanceNum);
    
    // Step 3: Register vehicle
    await page.goto('/driver');
    
    const vehicleNameInput = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput.fill('Tesla Model 3');
    
    const chipIdInput = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput.fill('CHIP123456789');
    
    const publicKeyInput = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput.fill('0x1234abcd...');
    
    const submitButton = page.locator('text=Register Vehicle').first();
    await submitButton.click();
    await transactionHelper.waitForTransaction();
    
    // Verify vehicle is registered
    const vehicleList = page.locator('[data-testid="vehicle-list"]').first();
    await expect(vehicleList).toContainText('Tesla Model 3');
    
    // Step 4: Add trusted charger
    const chargerIdInput = page.locator('input[placeholder*="Charger ID"]').first();
    await chargerIdInput.fill('1');
    
    const addButton = page.locator('text=Add Trusted Charger').first();
    await addButton.click();
    await transactionHelper.waitForTransaction();
    
    // Verify charger is trusted
    const trustedList = page.locator('[data-testid="trusted-chargers-list"]').first();
    await expect(trustedList).toContainText('1');
    
    // Step 5: Approve USDC for contract
    const approveButton = page.locator('text=Approve USDC').first();
    await approveButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 6: Create charging session
    const sessionForm = page.locator('[data-testid="session-form"]').first();
    await expect(sessionForm).toBeVisible();
    
    const vehicleSelect = page.locator('select').first();
    await vehicleSelect.selectOption('Tesla Model 3');
    
    const sessionChargerIdInput = page.locator('input[placeholder*="Charger ID"]').nth(1);
    await sessionChargerIdInput.fill('1');
    
    const depositInput = page.locator('input[placeholder*="Initial Deposit"]').first();
    await depositInput.fill('50');
    
    const createSessionButton = page.locator('text=Start Charging Session').first();
    await createSessionButton.click();
    await transactionHelper.waitForTransaction();
    
    // Verify session is created
    const activeSessions = page.locator('[data-testid="active-sessions"]').first();
    await expect(activeSessions).toBeVisible();
    
    // Step 7: Switch to charger operator view
    await page.goto('/charger');
    
    // Verify charger can see the session
    const chargerActiveSessions = page.locator('[data-testid="active-sessions"]').first();
    await expect(chargerActiveSessions).toBeVisible();
    
    // Step 8: End session and propose charge
    const endSessionButton = page.locator('text=End Session').first();
    await expect(endSessionButton).toBeVisible();
    await endSessionButton.click();
    
    const chargeInput = page.locator('input[placeholder*="Proposed Charge"]').first();
    await chargeInput.fill('30');
    
    const proposeButton = page.locator('text=Propose Charge').first();
    await proposeButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 9: Switch back to driver to finalize
    await page.goto('/driver');
    
    // Finalize session
    const finalizeButton = page.locator('text=Finalize Session').first();
    await expect(finalizeButton).toBeVisible();
    await finalizeButton.click();
    await transactionHelper.waitForTransaction();
    
    // Verify session is settled
    const sessionHistory = page.locator('[data-testid="session-history"]').first();
    await expect(sessionHistory).toBeVisible();
  });

  test('should complete sponsored charging journey', async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    const transactionHelper = new TransactionHelper(page);
    
    // Step 1: Connect wallet as sponsor
    await page.goto('/');
    await walletHelper.connectWallet();
    
    // Step 2: Get USDC for sponsor
    await page.goto('/usdc');
    const quickFaucetButton = page.locator('text=Quick Faucet').first();
    await quickFaucetButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 3: Go to driver page and register vehicle
    await page.goto('/driver');
    
    const vehicleNameInput = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput.fill('BMW i3');
    
    const chipIdInput = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput.fill('CHIP987654321');
    
    const publicKeyInput = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput.fill('0x5678efgh...');
    
    const submitButton = page.locator('text=Register Vehicle').first();
    await submitButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 4: Create sponsored session
    const sessionForm = page.locator('[data-testid="session-form"]').first();
    await expect(sessionForm).toBeVisible();
    
    const vehicleSelect = page.locator('select').first();
    await vehicleSelect.selectOption('BMW i3');
    
    const sessionChargerIdInput = page.locator('input[placeholder*="Charger ID"]').nth(1);
    await sessionChargerIdInput.fill('1');
    
    const depositInput = page.locator('input[placeholder*="Initial Deposit"]').first();
    await depositInput.fill('50');
    
    // Check sponsor option
    const sponsorCheckbox = page.locator('input[type="checkbox"]').first();
    await sponsorCheckbox.check();
    
    const createSessionButton = page.locator('text=Start Charging Session').first();
    await createSessionButton.click();
    await transactionHelper.waitForTransaction();
    
    // Verify sponsored session is created
    const activeSessions = page.locator('[data-testid="active-sessions"]').first();
    await expect(activeSessions).toBeVisible();
  });

  test('should complete guest charging journey', async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    const transactionHelper = new TransactionHelper(page);
    
    // Step 1: Connect wallet as charger operator
    await page.goto('/charger');
    await walletHelper.connectWallet();
    
    // Step 2: Get USDC for charger operator
    await page.goto('/usdc');
    const quickFaucetButton = page.locator('text=Quick Faucet').first();
    await quickFaucetButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 3: Create guest session
    await page.goto('/charger');
    
    const sessionForm = page.locator('[data-testid="session-form"]').first();
    await expect(sessionForm).toBeVisible();
    
    // Select guest mode
    const guestRadio = page.locator('input[value="guest"]').first();
    await guestRadio.check();
    
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
    
    // Verify guest session is created
    const activeSessions = page.locator('[data-testid="active-sessions"]').first();
    await expect(activeSessions).toBeVisible();
    
    // Step 4: End session and propose charge
    const endSessionButton = page.locator('text=End Session').first();
    await endSessionButton.click();
    
    const chargeInput = page.locator('input[placeholder*="Proposed Charge"]').first();
    await chargeInput.fill('30');
    
    const proposeButton = page.locator('text=Propose Charge').first();
    await proposeButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 5: Finalize session (charger can finalize in guest mode)
    const finalizeButton = page.locator('text=Finalize Session').first();
    await finalizeButton.click();
    await transactionHelper.waitForTransaction();
  });

  test('should complete dispute resolution journey', async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    const transactionHelper = new TransactionHelper(page);
    
    // Step 1: Connect wallet as driver
    await page.goto('/driver');
    await walletHelper.connectWallet();
    
    // Step 2: Get USDC
    await page.goto('/usdc');
    const quickFaucetButton = page.locator('text=Quick Faucet').first();
    await quickFaucetButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 3: Register vehicle and create session
    await page.goto('/driver');
    
    const vehicleNameInput = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput.fill('Nissan Leaf');
    
    const chipIdInput = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput.fill('CHIP456789123');
    
    const publicKeyInput = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput.fill('0x9abcdef0...');
    
    const submitButton = page.locator('text=Register Vehicle').first();
    await submitButton.click();
    await transactionHelper.waitForTransaction();
    
    // Create session
    const sessionForm = page.locator('[data-testid="session-form"]').first();
    const vehicleSelect = page.locator('select').first();
    await vehicleSelect.selectOption('Nissan Leaf');
    
    const sessionChargerIdInput = page.locator('input[placeholder*="Charger ID"]').nth(1);
    await sessionChargerIdInput.fill('1');
    
    const depositInput = page.locator('input[placeholder*="Initial Deposit"]').first();
    await depositInput.fill('50');
    
    const createSessionButton = page.locator('text=Start Charging Session').first();
    await createSessionButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 4: Switch to charger and propose high charge
    await page.goto('/charger');
    
    const endSessionButton = page.locator('text=End Session').first();
    await endSessionButton.click();
    
    const chargeInput = page.locator('input[placeholder*="Proposed Charge"]').first();
    await chargeInput.fill('45'); // High charge that might be disputed
    
    const proposeButton = page.locator('text=Propose Charge').first();
    await proposeButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 5: Switch back to driver and dispute
    await page.goto('/driver');
    
    const disputeButton = page.locator('text=Dispute Session').first();
    await expect(disputeButton).toBeVisible();
    await disputeButton.click();
    
    const reasonInput = page.locator('input[placeholder*="Dispute Reason"]').first();
    await reasonInput.fill('Charger overcharged');
    
    const submitDisputeButton = page.locator('text=Submit Dispute').first();
    await submitDisputeButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 6: Switch to admin to resolve dispute
    await page.goto('/admin');
    
    // Check if user has admin access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    const resolveButton = page.locator('text=Resolve Dispute').first();
    await expect(resolveButton).toBeVisible();
    await resolveButton.click();
    
    const driverRefundInput = page.locator('input[placeholder*="Driver Refund"]').first();
    await driverRefundInput.fill('30');
    
    const chargerPaymentInput = page.locator('input[placeholder*="Charger Payment"]').first();
    await chargerPaymentInput.fill('20');
    
    const submitResolutionButton = page.locator('text=Submit Resolution').first();
    await submitResolutionButton.click();
    await transactionHelper.waitForTransaction();
    
    // Verify dispute is resolved
    const resolvedMessage = page.locator('text=Dispute resolved').first();
    await expect(resolvedMessage).toBeVisible();
  });

  test('should handle multiple concurrent sessions', async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    const transactionHelper = new TransactionHelper(page);
    
    // Step 1: Connect wallet
    await page.goto('/driver');
    await walletHelper.connectWallet();
    
    // Step 2: Get USDC
    await page.goto('/usdc');
    const quickFaucetButton = page.locator('text=Quick Faucet').first();
    await quickFaucetButton.click();
    await transactionHelper.waitForTransaction();
    
    // Step 3: Register multiple vehicles
    await page.goto('/driver');
    
    // Register first vehicle
    const vehicleNameInput1 = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput1.fill('Tesla Model 3');
    
    const chipIdInput1 = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput1.fill('CHIP111111111');
    
    const publicKeyInput1 = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput1.fill('0x11111111...');
    
    const submitButton1 = page.locator('text=Register Vehicle').first();
    await submitButton1.click();
    await transactionHelper.waitForTransaction();
    
    // Register second vehicle
    const vehicleNameInput2 = page.locator('input[placeholder*="Vehicle Name"]').first();
    await vehicleNameInput2.fill('BMW i3');
    
    const chipIdInput2 = page.locator('input[placeholder*="Chip ID"]').first();
    await chipIdInput2.fill('CHIP222222222');
    
    const publicKeyInput2 = page.locator('input[placeholder*="Public Key"]').first();
    await publicKeyInput2.fill('0x22222222...');
    
    const submitButton2 = page.locator('text=Register Vehicle').first();
    await submitButton2.click();
    await transactionHelper.waitForTransaction();
    
    // Step 4: Create multiple sessions
    const sessionForm = page.locator('[data-testid="session-form"]').first();
    
    // First session
    const vehicleSelect1 = page.locator('select').first();
    await vehicleSelect1.selectOption('Tesla Model 3');
    
    const sessionChargerIdInput1 = page.locator('input[placeholder*="Charger ID"]').nth(1);
    await sessionChargerIdInput1.fill('1');
    
    const depositInput1 = page.locator('input[placeholder*="Initial Deposit"]').first();
    await depositInput1.fill('50');
    
    const createSessionButton1 = page.locator('text=Start Charging Session').first();
    await createSessionButton1.click();
    await transactionHelper.waitForTransaction();
    
    // Second session
    const vehicleSelect2 = page.locator('select').first();
    await vehicleSelect2.selectOption('BMW i3');
    
    const sessionChargerIdInput2 = page.locator('input[placeholder*="Charger ID"]').nth(1);
    await sessionChargerIdInput2.fill('2');
    
    const depositInput2 = page.locator('input[placeholder*="Initial Deposit"]').first();
    await depositInput2.fill('75');
    
    const createSessionButton2 = page.locator('text=Start Charging Session').first();
    await createSessionButton2.click();
    await transactionHelper.waitForTransaction();
    
    // Verify both sessions are active
    const activeSessions = page.locator('[data-testid="active-sessions"]').first();
    await expect(activeSessions).toBeVisible();
    
    const sessionItems = page.locator('[data-testid="session-item"]');
    const sessionCount = await sessionItems.count();
    expect(sessionCount).toBeGreaterThanOrEqual(2);
  });
});
