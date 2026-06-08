import { test, expect } from '@playwright/test';
import { screenshotPath } from './helpers/screenshotPath';

test('Login to Staging and Analyze Dashboard', async ({ page }) => {
  // Increase timeout for staging environment
  test.setTimeout(60000);

  // Navigate to login page
  await page.goto('https://printbridge.staging.obdev.my.id/login', { waitUntil: 'networkidle' });
  
  // Fill in credentials using ID selectors
  await page.locator('#email').fill('dev+admin@officebee.co');
  await page.locator('#password').fill('oUiXzTVcb_9sQnPh');
  
  // Click login button with text 'Sign in'
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for navigation and verify we are logged in
  // It seems it might redirect to / or some other URL
  await page.waitForURL(url => url.pathname !== '/login', { timeout: 30000 });
  
  // Take a screenshot for verification
  await page.screenshot({ path: screenshotPath('staging_dashboard_check.png'), fullPage: true });

  // Log some information about the page
  console.log('Logged in successfully or redirected. Current URL:', page.url());

  // List headings to identify where we are
  const headings = await page.getByRole('heading').allInnerTexts();
  console.log('Headings found:', headings);

  // List links in sidebar if any
  const sidebarLinks = await page.locator('nav a, aside a').allInnerTexts();
  console.log('Sidebar/Nav links found:', sidebarLinks);
});
