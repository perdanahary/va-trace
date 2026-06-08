import { test, expect } from '@playwright/test';

test.describe('VA Trace Prototype - Core Flows', () => {

  test('Admin Workflow: Dashboard and Order Review', async ({ page }) => {
    await page.goto('https://printbridge.staging.obdev.my.id/admin');

    // Check Dashboard
    await expect(page.getByText('Procurement Dashboard')).toBeVisible();
    await expect(page.getByText('Active Orders')).toBeVisible();
    await expect(page.getByText('OR-2026-816972')).toBeVisible();

    // Navigate to All Orders
    await page.getByRole('link', { name: 'All Orders' }).click();
    await expect(page.url()).toContain('/admin/orders');
    await expect(page.getByText('All Order Requests')).toBeVisible();

    // View Order Detail
    await page.getByText('OR-2026-816972').click();
    await expect(page.url()).toContain('/admin/orders/OR-2026-816972');
    await expect(page.getByText('Order Details: OR-2026-816972')).toBeVisible();
    await expect(page.getByText('Fulfillment Progress')).toBeVisible();
  });

  test('Client Workflow: Dashboard and Create OR', async ({ page }) => {
    await page.goto('https://printbridge.staging.obdev.my.id/client');

    // Check Dashboard
    await expect(page.getByText('Client Dashboard')).toBeVisible();
    await expect(page.getByText('Read-Only Viewer')).toBeVisible();

    // Navigate to Create OR
    await page.getByRole('link', { name: 'Create OR' }).click();
    await expect(page.url()).toContain('/client/create');
    await expect(page.getByText('New Order Request')).toBeVisible();

    // Fill Form (Partial)
    await page.getByLabel('Client PO Ref *').fill('PO-TEST-123');
    await page.getByLabel('Campaign Name *').fill('Test Campaign');

    // Check Item Specification
    await expect(page.getByText('Item Specification')).toBeVisible();
    await page.getByRole('button', { name: 'Add Item' }).click();
  });

  test('Vendor Workflow: Dashboard and Update Progress', async ({ page }) => {
    await page.goto('https://printbridge.staging.obdev.my.id/vendor');

    // Check Dashboard
    await expect(page.getByText('Vendor Dashboard')).toBeVisible();
    await expect(page.getByText('Inbox Order')).toBeVisible();

    // Navigate to Update Progress
    await page.getByRole('button', { name: 'Update Progress' }).first().click();
    await expect(page.url()).toContain('/vendor/update/');
    await expect(page.getByText('Fulfillment Summary')).toBeVisible();

    // Interaction Check
    await expect(page.getByText('In Production')).toBeVisible();
    const productionInput = page.getByRole('spinbutton').first();
    await expect(productionInput).toBeVisible();
  });

  test('Shared: Order Progress Tracking', async ({ page }) => {
    await page.goto('https://printbridge.staging.obdev.my.id/admin/progress');
    await expect(page.getByText('Ongoing Order Progress')).toBeVisible();
    await expect(page.getByText('Next Milestone')).toBeVisible();
  });

  test('Role Switching', async ({ page }) => {
    await page.goto('https://printbridge.staging.obdev.my.id/admin');

    // Switch to Client
    await page.getByRole('link', { name: 'CLT' }).click();
    await expect(page.url()).toContain('/client');
    await expect(page.getByText('Client Dashboard')).toBeVisible();

    // Switch to Vendor
    await page.getByRole('link', { name: 'VND' }).click();
    await expect(page.url()).toContain('/vendor');
    await expect(page.getByText('Vendor Dashboard')).toBeVisible();
  });

});
