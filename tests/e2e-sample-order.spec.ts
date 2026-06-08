import { test, expect } from '@playwright/test';
import { screenshotPath } from './helpers/screenshotPath';

test.describe('E2E Order Flow: Admin to Supplier', () => {

  test('Complete Flow: Admin Review -> Vendor Update', async ({ page }) => {
    // 1. ADMIN SIDE: Dashboard
    await page.goto('https://printbridge.staging.obdev.my.id/admin');
    await expect(page.getByText('Procurement Dashboard')).toBeVisible();
    await page.screenshot({ path: screenshotPath('e2e_screenshots', 'admin', '01_dashboard.png') });

    // 2. ADMIN SIDE: All Orders
    await page.getByRole('link', { name: 'All Orders' }).click();
    await expect(page.getByText('All Order Requests')).toBeVisible();
    await page.screenshot({ path: screenshotPath('e2e_screenshots', 'admin', '02_all_orders.png') });

    // 3. ADMIN SIDE: Order Detail (OR-2026-901234)
    await page.getByText('OR-2026-901234').click();
    await expect(page.getByText('Order Details: OR-2026-901234')).toBeVisible();
    await page.screenshot({ path: screenshotPath('e2e_screenshots', 'admin', '03_order_detail.png') });

    // 4. VENDOR SIDE: Dashboard
    await page.goto('https://printbridge.staging.obdev.my.id/vendor');
    await expect(page.getByText('Vendor Dashboard')).toBeVisible();
    await page.screenshot({ path: screenshotPath('e2e_screenshots', 'vendor', '01_dashboard.png') });

    // 5. VENDOR SIDE: Update Progress for OR-2026-901234
    // Find the card containing OR-2026-901234 and click Update Progress
    await page.locator('.group', { hasText: 'OR-2026-901234' }).getByRole('link', { name: 'Update Progress' }).click();
    await expect(page.getByText('Update Progress: OR-2026-901234')).toBeVisible();
    await page.screenshot({ path: screenshotPath('e2e_screenshots', 'vendor', '02_update_progress_initial.png') });

    // 6. VENDOR SIDE: Modify Progress
    const productionInput = page.getByRole('spinbutton').first();
    await productionInput.fill('400');

    const readyInput = page.getByRole('spinbutton').nth(1);
    await readyInput.fill('250');

    const shippingInput = page.getByRole('spinbutton').nth(2);
    await shippingInput.fill('150');

    await page.screenshot({ path: screenshotPath('e2e_screenshots', 'vendor', '03_update_progress_modified.png') });

    // 7. VENDOR SIDE: Save
    await page.getByRole('button', { name: 'Save Progress' }).click();
    await expect(page.getByText('Vendor Dashboard')).toBeVisible();
    await page.screenshot({ path: screenshotPath('e2e_screenshots', 'vendor', '04_saved_success.png') });
  });

});
