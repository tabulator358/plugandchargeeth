import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check if page loads without errors
    await expect(page).toHaveTitle(/PlugAndCharge/);
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('PlugAndCharge');
  });

  test('should render all sections', async ({ page }) => {
    await page.goto('/');
    
    // Check for hero section
    await expect(page.locator('text=PlugAndCharge')).toBeVisible();
    
    // Check for features section
    await expect(page.locator('text=Features')).toBeVisible();
    
    // Check for how it works section
    await expect(page.locator('text=How it works')).toBeVisible();
    
    // Check for footer
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should have working navigation buttons', async ({ page }) => {
    await page.goto('/');
    
    // Test "Start Enjoying PlugAndCharge Experience" button
    const startButton = page.locator('text=Start Enjoying PlugAndCharge Experience').first();
    await expect(startButton).toBeVisible();
    await startButton.click();
    
    // Should navigate to driver page or show wallet connection
    await page.waitForLoadState('networkidle');
    
    // Test "Explore how it works" button
    await page.goto('/');
    const exploreButton = page.locator('text=Explore how it works').first();
    await expect(exploreButton).toBeVisible();
    await exploreButton.click();
    
    // Should navigate to appropriate page
    await page.waitForLoadState('networkidle');
  });

  test('should handle animations without breaking layout', async ({ page }) => {
    await page.goto('/');
    
    // Wait for animations to load
    await page.waitForTimeout(2000);
    
    // Check that main content is still visible after animations
    await expect(page.locator('text=PlugAndCharge')).toBeVisible();
    
    // Check that buttons are still clickable
    const startButton = page.locator('text=Start Enjoying PlugAndCharge Experience').first();
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that content is still visible on mobile
    await expect(page.locator('text=PlugAndCharge')).toBeVisible();
    
    // Check that buttons are still accessible
    const startButton = page.locator('text=Start Enjoying PlugAndCharge Experience').first();
    await expect(startButton).toBeVisible();
  });

  test('should not have console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for any console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('should load all images correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for images to load
    await page.waitForLoadState('networkidle');
    
    // Check that images are loaded (not broken)
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toBeVisible();
      
      // Check that image has loaded (naturalWidth > 0)
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });
});
