import { Page } from '@playwright/test';

export class TransactionHelper {
  constructor(private page: Page) {}

  async waitForTransaction(transactionHash?: string) {
    // Wait for transaction to be mined
    await this.page.waitForTimeout(3000); // Wait 3 seconds for transaction to be mined
    
    // Look for transaction success notification
    const successNotification = this.page.locator('text=Transaction successful').first();
    if (await successNotification.isVisible({ timeout: 10000 })) {
      await successNotification.waitFor({ state: 'hidden', timeout: 30000 });
    }
  }

  async waitForTransactionFailure() {
    // Wait for transaction failure notification
    const failureNotification = this.page.locator('text=Transaction failed').first();
    if (await failureNotification.isVisible({ timeout: 10000 })) {
      await failureNotification.waitFor({ state: 'hidden', timeout: 30000 });
    }
  }

  async confirmTransaction() {
    // Look for confirm button in transaction modal
    const confirmButton = this.page.locator('text=Confirm').first();
    
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  async rejectTransaction() {
    // Look for reject button in transaction modal
    const rejectButton = this.page.locator('text=Reject').first();
    
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
    }
  }

  async waitForLoadingToComplete() {
    // Wait for loading indicators to disappear
    const loadingIndicator = this.page.locator('[data-testid="loading"]').first();
    
    if (await loadingIndicator.isVisible()) {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
    }
  }

  async checkForErrors() {
    // Check for error messages on the page
    const errorMessages = this.page.locator('[data-testid="error-message"]');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      const errors = [];
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorMessages.nth(i).textContent();
        if (errorText) {
          errors.push(errorText);
        }
      }
      throw new Error(`Found ${errorCount} error(s): ${errors.join(', ')}`);
    }
  }
}
