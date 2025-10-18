import { Page } from '@playwright/test';

export class WalletHelper {
  constructor(private page: Page) {}

  async connectWallet() {
    // Look for connect wallet button
    const connectButton = this.page.locator('text=Connect Wallet').first();
    
    if (await connectButton.isVisible()) {
      await connectButton.click();
      
      // Wait for wallet connection modal
      await this.page.waitForSelector('[data-testid="wallet-connection-modal"]', { timeout: 10000 });
      
      // Select MetaMask or first available wallet
      const metamaskButton = this.page.locator('text=MetaMask').first();
      if (await metamaskButton.isVisible()) {
        await metamaskButton.click();
      }
      
      // Wait for connection to complete
      await this.page.waitForSelector('text=Connected', { timeout: 15000 });
    }
  }

  async disconnectWallet() {
    // Look for disconnect button
    const disconnectButton = this.page.locator('text=Disconnect').first();
    
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click();
      
      // Wait for disconnection to complete
      await this.page.waitForSelector('text=Connect Wallet', { timeout: 10000 });
    }
  }

  async switchAccount(accountIndex: number = 1) {
    // Click on account button to open account menu
    const accountButton = this.page.locator('[data-testid="account-button"]').first();
    
    if (await accountButton.isVisible()) {
      await accountButton.click();
      
      // Look for switch account option
      const switchAccountButton = this.page.locator(`text=Account ${accountIndex}`).first();
      if (await switchAccountButton.isVisible()) {
        await switchAccountButton.click();
      }
    }
  }

  async getWalletAddress(): Promise<string | null> {
    // Try to get wallet address from the UI
    const addressElement = this.page.locator('[data-testid="wallet-address"]').first();
    
    if (await addressElement.isVisible()) {
      const address = await addressElement.textContent();
      return address?.trim() || null;
    }
    
    return null;
  }

  async isConnected(): Promise<boolean> {
    // Check if wallet is connected by looking for disconnect button or connected state
    const disconnectButton = this.page.locator('text=Disconnect').first();
    const connectedIndicator = this.page.locator('text=Connected').first();
    
    return await disconnectButton.isVisible() || await connectedIndicator.isVisible();
  }
}
