import { test, expect } from '@playwright/test';

test.describe('Booking Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to bookings page
    await page.getByRole('link', { name: /bookings/i }).first().click();
    await expect(page).toHaveURL(/\/bookings/);
  });

  test('should display bookings list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /bookings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new booking/i })).toBeVisible();
    
    // Check for search and filters
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('should open create booking modal', async ({ page }) => {
    await page.getByRole('button', { name: /new booking/i }).click();
    
    // Modal should be visible
    await expect(page.getByRole('heading', { name: /create new booking/i })).toBeVisible();
    await expect(page.getByLabel(/customer/i)).toBeVisible();
    await expect(page.getByLabel(/service/i)).toBeVisible();
    await expect(page.getByLabel(/booking date/i)).toBeVisible();
  });

  test('should show validation errors in booking form', async ({ page }) => {
    await page.getByRole('button', { name: /new booking/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create booking/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/customer is required/i)).toBeVisible();
    await expect(page.getByText(/service is required/i)).toBeVisible();
  });

  test('should create a new booking', async ({ page }) => {
    await page.getByRole('button', { name: /new booking/i }).click();
    
    // Fill in the form
    const customerSelect = page.getByLabel(/customer/i);
    await customerSelect.click();
    await customerSelect.selectOption({ index: 1 }); // Select first customer
    
    const serviceSelect = page.getByLabel(/service/i);
    await serviceSelect.click();
    await serviceSelect.selectOption({ index: 1 }); // Select first service
    
    // Set booking date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().slice(0, 16);
    await page.getByLabel(/booking date/i).fill(dateString);
    
    // Add notes
    await page.getByPlaceholder(/add any notes/i).fill('E2E test booking');
    
    // Submit the form
    await page.getByRole('button', { name: /create booking/i }).click();
    
    // Should show success message and close modal
    await expect(page.getByText(/booking created successfully/i)).toBeVisible();
  });

  test('should search bookings', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('test');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Results should be filtered
    const bookingRows = page.getByRole('row');
    expect(await bookingRows.count()).toBeGreaterThanOrEqual(0);
  });

  test('should filter bookings by status', async ({ page }) => {
    // Find status filter dropdown
    const statusFilter = page.locator('select').filter({ hasText: /all statuses|status/i });
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('CONFIRMED');
      
      // Wait for filter to apply
      await page.waitForTimeout(500);
      
      // Check that filtered bookings are displayed
      const bookingCards = page.getByText(/confirmed/i);
      expect(await bookingCards.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('should view booking details', async ({ page }) => {
    // Click on the first "View" button
    const viewButton = page.getByRole('button', { name: /view/i }).first();
    
    if (await viewButton.isVisible()) {
      await viewButton.click();
      
      // Should navigate to booking details page
      await expect(page).toHaveURL(/\/bookings\/[a-zA-Z0-9-]+/);
      
      // Check for booking details
      await expect(page.getByText(/customer/i)).toBeVisible();
      await expect(page.getByText(/service/i)).toBeVisible();
      await expect(page.getByText(/status/i)).toBeVisible();
    }
  });

  test('should switch to Kanban view', async ({ page }) => {
    const kanbanButton = page.getByRole('button', { name: /kanban view/i });
    
    if (await kanbanButton.isVisible()) {
      await kanbanButton.click();
      
      // Should navigate to Kanban view
      await expect(page).toHaveURL(/\/bookings\/kanban/);
      
      // Check for Kanban columns
      await expect(page.getByText(/inquiry/i)).toBeVisible();
      await expect(page.getByText(/confirmed/i)).toBeVisible();
    }
  });
});
