import { test, expect } from '@playwright/test';

test.describe('Nutrition Screen Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to nutrition page
    await page.goto('http://localhost:3001/nutrition');
  });

  test('should hide content area initially and show when nav is clicked', async ({ page }) => {
    // Nav bar should be visible
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Workspaces should NOT be visible initially (except the header which is always there)
    // We check for elements inside TodayWorkspace or SearchWorkspace
    const waterMetasTitle = page.getByText('Água e metas');
    await expect(waterMetasTitle).not.toBeVisible();

    const searchInput = page.getByPlaceholder(/banana prata/i);
    await expect(searchInput).not.toBeVisible();

    // Click on "Hoje"
    await page.getByRole('button', { name: /^Hoje$/i }).click();
    await expect(waterMetasTitle).toBeVisible();

    // Click on "Buscar"
    await page.getByRole('button', { name: /^Buscar$/i }).click();
    await expect(searchInput).toBeVisible();
    
    // Check if autoFocus worked
    await expect(searchInput).toBeFocused();
  });

  test('should open Buscar area when clicking Adicionar in header', async ({ page }) => {
    // Adicionar button in header (mobile)
    const addBtn = page.getByRole('button', { name: /^Adicionar$/i });
    await expect(addBtn).toBeVisible();
    
    await addBtn.click();
    
    // Should show search area
    const searchInput = page.getByPlaceholder(/banana prata/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();
  });

  test('water panel should be full width and kcal badge removed', async ({ page }) => {
    await page.getByRole('button', { name: /^Hoje$/i }).click();
    
    // Check for water info
    await expect(page.getByText('Água e metas')).toBeVisible();
    
    // Kcal badge should NOT be there near water (removed from MobileSummaryStrip)
    // We search specifically for the Kcal percentage inside the water section
    const kcalBadge = page.locator('div:has-text("Água e metas") >> text=/Kcal \\d+%/i');
    await expect(kcalBadge).toHaveCount(0);
  });
});
