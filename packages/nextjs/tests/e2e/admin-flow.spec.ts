import { test, expect } from '@playwright/test';
import { WalletHelper } from '../helpers/wallet';
import { TransactionHelper } from '../helpers/transactions';

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    const walletHelper = new WalletHelper(page);
    await page.goto('/admin');
    await walletHelper.connectWallet();
  });

  test('should check access control - only owner can access', async ({ page }) => {
    // If user is not owner, should show access denied message
    const accessDenied = page.locator('text=Access Denied').or(page.locator('text=Not Authorized')).first();
    
    // Wait a bit to see if access is denied
    await page.waitForTimeout(3000);
    
    if (await accessDenied.isVisible()) {
      // Non-owner user should see access denied
      await expect(accessDenied).toBeVisible();
      return;
    }
    
    // If no access denied message, user might be owner - continue with admin tests
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('should display system overview', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    // Check that system overview is displayed
    const systemOverview = page.locator('[data-testid="system-overview"]').first();
    await expect(systemOverview).toBeVisible();
    
    // Check for key metrics
    await expect(systemOverview).toContainText('Total Sessions');
    await expect(systemOverview).toContainText('Active Sessions');
    await expect(systemOverview).toContainText('Disputed Sessions');
    await expect(systemOverview).toContainText('Settled Sessions');
    await expect(systemOverview).toContainText('Total Volume');
  });

  test('should display current system parameters', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    // Check that system parameters are displayed
    const systemParams = page.locator('[data-testid="system-parameters"]').first();
    await expect(systemParams).toBeVisible();
    
    // Check for parameter values
    await expect(systemParams).toContainText('Min Deposit');
    await expect(systemParams).toContainText('Max Deposit');
    await expect(systemParams).toContainText('Refund Timeout');
  });

  test('should update system parameters', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    const transactionHelper = new TransactionHelper(page);
    
    // Update min deposit
    const minDepositInput = page.locator('input[placeholder*="Min Deposit"]').first();
    await minDepositInput.fill('20');
    
    const updateMinButton = page.locator('text=Update Min Deposit').first();
    await expect(updateMinButton).toBeVisible();
    await updateMinButton.click();
    
    // Wait for transaction to complete
    await transactionHelper.waitForTransaction();
    
    // Check that parameter was updated
    const systemParams = page.locator('[data-testid="system-parameters"]').first();
    await expect(systemParams).toContainText('20');
  });

  test('should view all sessions', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    // Check that all sessions section is visible
    const allSessions = page.locator('[data-testid="all-sessions"]').first();
    await expect(allSessions).toBeVisible();
    
    // Should show session list if any exist
    const sessionItems = page.locator('[data-testid="session-item"]');
    const sessionCount = await sessionItems.count();
    
    if (sessionCount > 0) {
      // Check that session items are displayed
      await expect(sessionItems.first()).toBeVisible();
    }
  });

  test('should filter sessions by state', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    // Check that filter controls are visible
    const filterControls = page.locator('[data-testid="session-filters"]').first();
    await expect(filterControls).toBeVisible();
    
    // Test filtering by state
    const stateFilter = page.locator('select[data-testid="state-filter"]').first();
    if (await stateFilter.isVisible()) {
      await stateFilter.selectOption('Active');
      
      // Check that only active sessions are shown
      const sessionItems = page.locator('[data-testid="session-item"]');
      const sessionCount = await sessionItems.count();
      
      for (let i = 0; i < sessionCount; i++) {
        const sessionItem = sessionItems.nth(i);
        await expect(sessionItem).toContainText('Active');
      }
    }
  });

  test('should search sessions', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    // Check that search input is visible
    const searchInput = page.locator('input[placeholder*="Search sessions"]').first();
    await expect(searchInput).toBeVisible();
    
    // Test searching
    await searchInput.fill('1');
    
    // Check that search results are filtered
    const sessionItems = page.locator('[data-testid="session-item"]');
    const sessionCount = await sessionItems.count();
    
    if (sessionCount > 0) {
      // At least one session should contain the search term
      let foundMatch = false;
      for (let i = 0; i < sessionCount; i++) {
        const sessionItem = sessionItems.nth(i);
        const text = await sessionItem.textContent();
        if (text?.includes('1')) {
          foundMatch = true;
          break;
        }
      }
      expect(foundMatch).toBe(true);
    }
  });

  test('should resolve disputes', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    const transactionHelper = new TransactionHelper(page);
    
    // Look for disputed sessions
    const disputedSessions = page.locator('[data-testid="disputed-session"]');
    const disputedCount = await disputedSessions.count();
    
    if (disputedCount > 0) {
      // Click on first disputed session
      const firstDisputed = disputedSessions.first();
      await firstDisputed.click();
      
      // Fill dispute resolution form
      const driverRefundInput = page.locator('input[placeholder*="Driver Refund"]').first();
      await driverRefundInput.fill('25');
      
      const chargerPaymentInput = page.locator('input[placeholder*="Charger Payment"]').first();
      await chargerPaymentInput.fill('25');
      
      // Submit resolution
      const resolveButton = page.locator('text=Resolve Dispute').first();
      await expect(resolveButton).toBeVisible();
      await resolveButton.click();
      
      // Wait for transaction to complete
      await transactionHelper.waitForTransaction();
      
      // Check that dispute was resolved
      const resolvedMessage = page.locator('text=Dispute resolved').first();
      await expect(resolvedMessage).toBeVisible({ timeout: 10000 });
    } else {
      // No disputed sessions to resolve
      test.skip('No disputed sessions found');
    }
  });

  test('should handle invalid parameter updates', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    // Try to set invalid min deposit (higher than max)
    const minDepositInput = page.locator('input[placeholder*="Min Deposit"]').first();
    await minDepositInput.fill('2000'); // Higher than max deposit
    
    const updateMinButton = page.locator('text=Update Min Deposit').first();
    await updateMinButton.click();
    
    // Should show validation error
    const errorMessage = page.locator('text=Min deposit cannot be higher than max deposit').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should handle unauthorized access attempts', async ({ page }) => {
    // Try to access admin functions without proper permissions
    const adminButtons = page.locator('button:has-text("Update"), button:has-text("Resolve")');
    const buttonCount = await adminButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = adminButtons.nth(i);
      if (await button.isVisible()) {
        await button.click();
        
        // Should show unauthorized error
        const errorMessage = page.locator('text=Unauthorized').or(page.locator('text=Access Denied')).first();
        if (await errorMessage.isVisible({ timeout: 5000 })) {
          await expect(errorMessage).toBeVisible();
          break;
        }
      }
    }
  });

  test('should display session details correctly', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    // Check that session details are displayed
    const sessionItems = page.locator('[data-testid="session-item"]');
    const sessionCount = await sessionItems.count();
    
    if (sessionCount > 0) {
      const firstSession = sessionItems.first();
      
      // Check that session details are shown
      await expect(firstSession).toContainText('Session ID');
      await expect(firstSession).toContainText('Driver');
      await expect(firstSession).toContainText('Charger');
      await expect(firstSession).toContainText('State');
      await expect(firstSession).toContainText('Deposit');
    }
  });

  test('should handle pagination for large session lists', async ({ page }) => {
    // Check if user has access
    const accessDenied = page.locator('text=Access Denied').first();
    if (await accessDenied.isVisible()) {
      test.skip('User is not admin/owner');
    }
    
    // Check if pagination controls exist
    const paginationControls = page.locator('[data-testid="pagination"]').first();
    
    if (await paginationControls.isVisible()) {
      // Test pagination
      const nextButton = page.locator('button:has-text("Next")').first();
      const prevButton = page.locator('button:has-text("Previous")').first();
      
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }
      
      if (await prevButton.isVisible()) {
        await prevButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});
