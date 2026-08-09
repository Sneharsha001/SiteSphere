/**
 * Mobile responsiveness screenshot script (375px viewport — iPhone SE)
 * Captures: Submit DPR (empty), Submit DPR (filled top section),
 *           My Reports list, Report detail modal
 * Usage: node scripts/captureScreenshots.mjs
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

  console.log('📱 Viewport: 375×812 (iPhone SE)');

  // ── 1. Login ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', 'engineer@sitetrack.dev');
  await page.fill('#login-password', 'Engineer@123');
  await page.click('#login-submit-btn');
  await page.waitForURL(/\/reports/, { timeout: 10_000 });
  console.log('✅ Logged in as Site Engineer');

  // ── 2. My Reports list ────────────────────────────────────────────────────
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(OUT_DIR, '01-my-reports-list.png'), fullPage: false });
  console.log('📸 01-my-reports-list.png');

  // ── 3. Open report detail modal ───────────────────────────────────────────
  const firstCard = page.locator('[id^="report-card-"]').first();
  const cardCount = await firstCard.count();
  if (cardCount > 0) {
    await firstCard.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '02-report-detail-modal.png'), fullPage: false });
    console.log('📸 02-report-detail-modal.png');
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    console.log('⚠️  No report cards found to click — skipping detail modal screenshot');
  }

  // ── 4. Submit DPR — empty state ───────────────────────────────────────────
  await page.goto(`${BASE}/reports/new`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, '03-submit-dpr-empty-top.png'), fullPage: false });
  console.log('📸 03-submit-dpr-empty-top.png');

  // Scroll to bottom (submit button area)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, '04-submit-dpr-empty-bottom.png'), fullPage: false });
  console.log('📸 04-submit-dpr-empty-bottom.png');

  // ── 5. Submit DPR — fill top fields ──────────────────────────────────────
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // Select first available project
  const projectSelect = page.locator('#project-select');
  const projectCount = await projectSelect.count();
  if (projectCount > 0) {
    const optionValue = await projectSelect.locator('option').nth(1).getAttribute('value');
    if (optionValue) {
      await projectSelect.selectOption(optionValue);
      console.log('  → Selected project option');
    }
  }

  // Set today's date
  const today = new Date().toISOString().slice(0, 10);
  await page.fill('#date-picker', today);

  // Fill in work done
  await page.fill('#work-done-input', 'Poured M30 concrete for column grid B2–B6 (slab soffit formwork complete). Total 38 cu.m poured.');

  // Fill labour fields
  await page.fill('#labour-skilled-input', '8');
  await page.fill('#labour-unskilled-input', '12');
  await page.fill('#labour-operators-input', '3');

  await page.screenshot({ path: path.join(OUT_DIR, '05-submit-dpr-filled-top.png'), fullPage: false });
  console.log('📸 05-submit-dpr-filled-top.png');

  // Scroll to photo section
  await page.evaluate(() => {
    const el = document.querySelector('#photo-upload-input');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, '06-submit-dpr-photo-section.png'), fullPage: false });
  console.log('📸 06-submit-dpr-photo-section.png');

  // Scroll to submit button
  await page.evaluate(() => {
    const btn = document.querySelector('#submit-dpr-btn');
    if (btn) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, '07-submit-dpr-submit-btn.png'), fullPage: false });
  console.log('📸 07-submit-dpr-submit-btn.png');

  await browser.close();

  console.log(`\n✅ All screenshots saved to: ${OUT_DIR}`);
  console.log('Files:');
  fs.readdirSync(OUT_DIR).forEach(f => console.log(`  • ${f}`));
}

run().catch(err => {
  console.error('❌ Screenshot capture failed:', err);
  process.exit(1);
});
