import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display dashboard statistics', async ({ page }) => {
    // Check for statistics cards
    await expect(page.getByText(/total bookings/i)).toBeVisible();
    await expect(page.getByText(/total customers/i)).toBeVisible();
    await expect(page.getByText(/total revenue/i)).toBeVisible();
    await expect(page.getByText(/pending invoices/i)).toBeVisible();
  });

  test('should navigate to bookings page', async ({ page }) => {
    await page.getByRole('link', { name: /bookings/i }).first().click();
    await expect(page).toHaveURL(/\/bookings/);
    await expect(page.getByRole('heading', { name: /bookings/i })).toBeVisible();
  });

  test('should navigate to customers page', async ({ page }) => {
    await page.getByRole('link', { name: /customers/i }).first().click();
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.getByRole('heading', { name: /customers/i })).toBeVisible();
  });

  test('should navigate to invoices page', async ({ page }) => {
    await page.getByRole('link', { name: /invoices/i }).first().click();
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible();
  });

  test('should navigate to services page', async ({ page }) => {
    await page.getByRole('link', { name: /services/i }).first().click();
    await expect(page).toHaveURL(/\/services/);
    await expect(page.getByRole('heading', { name: /services/i })).toBeVisible();
  });

  test('should navigate to analytics page', async ({ page }) => {
    await page.getByRole('link', { name: /analytics/i }).first().click();
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible();
  });

  test('should navigate to portfolio page', async ({ page }) => {
    await page.getByRole('link', { name: /portfolio/i }).first().click();
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible();
  });
});
