/* eslint-disable no-undef */
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/vendor/orders', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const key = 'va-trace-v2-orders';
  const raw = localStorage.getItem(key);
  if (!raw) return console.log('No orders found');
  const orders = JSON.parse(raw);
  const order = orders.find(o => o.id === 'OR-2026-300001');
  if (!order) return console.log('Order not found');
  order.productionStatus = 'SUBMITTED';
  order.items.forEach(i => { i.productionStatus = 'SUBMITTED'; });
  localStorage.setItem(key, JSON.stringify(orders));
  console.log('Patched OR-2026-300001 to SUBMITTED');
});
await browser.close();
