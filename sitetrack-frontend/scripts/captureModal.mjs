/**
 * Capture report detail modal screenshot at 375px — with proper DOM waiting
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../screenshots-mobile');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:5173';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Login as site engineer
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', 'engineer@sitetrack.dev');
  await page.fill('#login-password', 'Engineer@123');
  await page.click('#login-submit-btn');
  await page.waitForLoadState('networkidle');
  console.log('Logged in. Current URL:', page.url());

  // Navigate explicitly to My Reports page
  await page.goto(`${BASE}/reports`, { waitUntil: 'networkidle' });
  console.log('On reports page. URL:', page.url());

  // Wait for either report cards OR "no reports" message (up to 8s)
  try {
    await page.waitForSelector('[id^="report-card-"], [data-testid="no-reports"], .text-slate-400', { timeout: 8000 });
  } catch {
    console.log('Timeout waiting for reports — taking screenshot anyway');
  }

  await page.screenshot({ path: path.join(OUT_DIR, '01-my-reports-list-loaded.png'), fullPage: false });
  console.log('📸 01-my-reports-list-loaded.png');

  // Log page content for debugging
  const cards = page.locator('[id^="report-card-"]');
  const count = await cards.count();
  console.log(`Report cards found: ${count}`);
  
  // Also check for any button or clickable element that leads to a report
  const anyClickable = page.locator('button[id], a[href*="/reports/"]');
  const clickCount = await anyClickable.count();
  console.log(`Other clickables: ${clickCount}`);

  if (count > 0) {
    await cards.first().click();
    // Wait for modal to appear
    await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '02-report-detail-modal.png'), fullPage: false });
    console.log('📸 02-report-detail-modal.png');

    // Scroll within the modal (find the scrollable container)
    await page.evaluate(() => {
      const scrollable = document.querySelector('.fixed.inset-0 .overflow-y-auto');
      if (scrollable) scrollable.scrollTop = 600;
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, '02b-report-detail-modal-bottom.png'), fullPage: false });
    console.log('📸 02b-report-detail-modal-bottom.png');
  } else {
    console.log('No report cards — attempting full page screenshot to see what is rendered');
    await page.screenshot({ path: path.join(OUT_DIR, '01-debug-full-page.png'), fullPage: true });
    console.log('📸 01-debug-full-page.png');
  }

  await browser.close();

  console.log('\nFiles:');
  fs.readdirSync(OUT_DIR).forEach(f => console.log(`  • ${f}`));
}

run().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
