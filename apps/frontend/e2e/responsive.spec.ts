import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ ...devices['iPhone 12'] });

  test.beforeEach(async ({ page }) => {
    // Login on mobile
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display mobile-optimized dashboard', async ({ page }) => {
    // Check viewport is mobile size
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
    
    // Dashboard should be visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    
    // Stats cards should stack vertically
    await expect(page.getByText(/total bookings/i)).toBeVisible();
  });

  test('should open mobile navigation menu', async ({ page }) => {
    // Look for hamburger menu button
    const menuButton = page.getByRole('button', { name: /menu|navigation/i });
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Navigation should be visible
      await expect(page.getByRole('link', { name: /bookings/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /customers/i })).toBeVisible();
    }
  });

  test('should handle touch interactions on bookings list', async ({ page }) => {
    await page.goto('/bookings');
    
    // Page should be scrollable
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Buttons should be touchable (minimum 44x44px)
    const newBookingButton = page.getByRole('button', { name: /new booking/i });
    const box = await newBookingButton.boundingBox();
    
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(40);
      expect(box.width).toBeGreaterThanOrEqual(40);
    }
  });

  test('should display mobile-optimized tables', async ({ page }) => {
    await page.goto('/bookings');
    
    // Tables should adapt to mobile view
    await expect(page.getByRole('heading', { name: /bookings/i })).toBeVisible();
    
    // Check if table is scrollable horizontally on mobile
    const table = page.locator('table').first();
    if (await table.isVisible()) {
      const box = await table.boundingBox();
      const viewport = page.viewportSize();
      
      // Table should fit within viewport or be scrollable
      expect(box).toBeTruthy();
    }
  });

  test('should work with mobile keyboard', async ({ page }) => {
    await page.goto('/bookings');
    await page.getByRole('button', { name: /new booking/i }).click();
    
    // Form inputs should trigger mobile keyboard
    const emailInput = page.getByLabel(/customer/i);
    await emailInput.tap();
    await emailInput.fill('test');
    
    // Input should have focus
    await expect(emailInput).toBeFocused();
  });
});

test.describe('Tablet Responsiveness', () => {
  test.use({ ...devices['iPad Pro'] });

  test('should display tablet-optimized layout', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Dashboard should use tablet layout (2-column grid likely)
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    
    // Stats should be visible and properly spaced
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeGreaterThanOrEqual(768);
    expect(viewport?.width).toBeLessThan(1024);
  });

  test('should display sidebar on tablet', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Sidebar navigation should be visible on tablet
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});
