import { test } from '@playwright/test';
import { screenshotPath } from './helpers/screenshotPath';

test('Debug Login Page Structure', async ({ page }) => {
  test.setTimeout(60000);
  console.log('Navigating to login page...');
  await page.goto('https://printbridge.staging.obdev.my.id/login', { waitUntil: 'networkidle' });
  
  console.log('Page loaded. Taking screenshot...');
  await page.screenshot({ path: screenshotPath('debug_login.png') });

  console.log('Analyzing inputs...');
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type,
      placeholder: i.placeholder,
      name: i.name,
      id: i.id,
      className: i.className
    }));
  });
  console.log('Inputs found:', JSON.stringify(inputs, null, 2));

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText,
      type: b.type,
      className: b.className
    }));
  });
  console.log('Buttons found:', JSON.stringify(buttons, null, 2));
});
