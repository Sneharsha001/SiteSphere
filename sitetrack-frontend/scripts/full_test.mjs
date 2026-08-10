// Full end‑to‑end Sitesphere test script (Playwright) – reproduces the manual checklist steps and captures screenshots
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('screenshots-mobile/full');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const API_LOG = [];

async function capture(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`📸 ${file}`);
}

async function login(page, email, password) {
  // Ensure a fresh auth state: clear cookies and any stored tokens
  await page.context().clearCookies();
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForURL('**/login', { timeout: 10000 });
  await page.waitForSelector('#login-email', { timeout: 10000 });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('#login-submit-btn');
  await page.waitForURL(/\/reports|\/dashboard|\/admin/, { timeout: 10000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  page.on('response', async (resp) => {
    try {
      const url = resp.url();
      const status = resp.status();
      const json = await resp.json().catch(() => null);
      API_LOG.push({ url, status, body: json });
    } catch (e) {}
  });

  // 1 – Engineer submit DPR with photos
  await login(page, 'engineer@sitetrack.dev', 'Engineer@123');
  await capture(page, '1a_engineer_dashboard');
  await page.goto('http://localhost:5173/reports/new', { waitUntil: 'networkidle' });
  await capture(page, '1b_submit_dpr_form_initial');
  await page.selectOption('#project-select', { index: 1 });
  const today = new Date().toISOString().slice(0, 10);
  await page.fill('#date-picker', today);
  await page.fill('#work-done-input', 'Test work description');
  await page.fill('#labour-skilled-input', '5');
  await page.fill('#labour-unskilled-input', '10');
  await page.fill('#labour-operators-input', '2');
  // upload placeholder images generated earlier
  const photo1 = "C:/Users/hp/.gemini/antigravity-ide/brain/6fb7a946-60bd-43ef-97c6-6e8343a98b36/photo1_1786300313454.png";
  const photo2 = "C:/Users/hp/.gemini/antigravity-ide/brain/6fb7a946-60bd-43ef-97c6-6e8343a98b36/photo2_1786300422165.png";
  await page.setInputFiles('#photo-upload-input', [photo1, photo2]);
  await capture(page, '1c_submit_dpr_filled');
  await page.click('#submit-dpr-btn');
  await page.waitForTimeout(2000);
  await capture(page, '1d_submit_dpr_success');

  // 2 – Offline sync
  // Navigate to reports while online first
  await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle' });
  await capture(page, '2a_my_reports_list');
  // Enable offline mode and navigate again to trigger offline banner
  await page.context().setOffline(true);
  try {
    await page.goto('http://localhost:5173/reports', { waitUntil: 'load' });
  } catch (e) {
    // navigation may fail due to offline, continue
  }
  await capture(page, '2b_offline_banner');
  // Restore connectivity
  await page.context().setOffline(false);
  await page.reload();
  await capture(page, '2c_back_online');

  // 3 – PM filter dashboard
  await page.goto('http://localhost:5173/logout', { waitUntil: 'networkidle' });
  await login(page, 'pm@sitetrack.dev', 'PM@123');
  await capture(page, '3a_pm_dashboard');
  await page.selectOption('#project-filter', { index: 1 });
  await page.fill('#date-filter-from', today);
  await page.fill('#date-filter-to', today);
  await page.click('#apply-filters-btn');
  await page.waitForTimeout(1500);
  await capture(page, '3b_pm_dashboard_filtered');
  const reportRow = page.locator('[id^="report-card-"]').first();
  if (await reportRow.count() > 0) {
    await reportRow.click();
    await page.waitForTimeout(1500);
    await capture(page, '3c_pm_report_detail');
  }

  // 4 – Admin create project & user
  await page.goto('http://localhost:5173/logout', { waitUntil: 'networkidle' });
  await login(page, 'admin@sitetrack.dev', 'Admin@123');
  await capture(page, '4a_admin_dashboard');
  await page.goto('http://localhost:5173/admin/projects/new', { waitUntil: 'networkidle' });
  await page.fill('#project-name', 'Test Project '+Date.now());
  await page.selectOption('#building-type', 'Residential');
  await page.click('#create-project-btn');
  await page.waitForTimeout(1000);
  await capture(page, '4b_project_created');
  await page.goto('http://localhost:5173/admin/users/new', { waitUntil: 'networkidle' });
  await page.fill('#user-email', 'newengineer@sitetrack.dev');
  await page.fill('#user-password', 'Engineer@123');
  await page.selectOption('#user-role', 'SiteEngineer');
  await page.selectOption('#assigned-project', { index: 1 });
  await page.click('#create-user-btn');
  await page.waitForTimeout(1000);
  await capture(page, '4c_user_created');

  // 5 – Role enforcement checks (sample)
  await page.goto('http://localhost:5173/logout', { waitUntil: 'networkidle' });
  await login(page, 'engineer@sitetrack.dev', 'Engineer@123');
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await capture(page, '5a_engineer_admin_access');
  await page.goto('http://localhost:5173/logout', { waitUntil: 'networkidle' });
  await login(page, 'pm@sitetrack.dev', 'PM@123');
  await page.goto('http://localhost:5173/reports/new', { waitUntil: 'networkidle' });
  await capture(page, '5b_pm_submit_dpr');

  // 6 – Mobile usability was already covered (screens are mobile sized)

  // 7 – Edit after 24h block & admin override – simulate fast forward
  await page.goto('http://localhost:5173/logout', { waitUntil: 'networkidle' });
  await login(page, 'engineer@sitetrack.dev', 'Engineer@123');
  // create a new DPR to have a fresh ID
  await page.goto('http://localhost:5173/reports/new', { waitUntil: 'networkidle' });
  await page.selectOption('#project-select', { index: 1 });
  await page.fill('#date-picker', today);
  await page.fill('#work-done-input', 'Temp work');
  await page.fill('#labour-skilled-input', '1');
  await page.fill('#labour-unskilled-input', '1');
  await page.fill('#labour-operators-input', '0');
  await page.click('#submit-dpr-btn');
  await page.waitForTimeout(2000);
  // fast‑forward system clock by 1 day (browser context)
  await page.addInitScript(() => {
    const now = Date.now() + 24*60*60*1000;
    Date.now = () => now;
  });
  // reload report list and attempt edit
  await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle' });
  const newest = page.locator('[id^="report-card-"]').first();
  await newest.click();
  await page.waitForTimeout(1000);
  await page.click('#edit-report-btn');
  await capture(page, '7a_edit_blocked');
  // admin override
  await page.goto('http://localhost:5173/logout', { waitUntil: 'networkidle' });
  await login(page, 'admin@sitetrack.dev', 'Admin@123');
  await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle' });
  const adminRow = page.locator('[id^="report-card-"]').first();
  await adminRow.click();
  await page.waitForTimeout(1000);
  await page.click('#admin-override-edit-btn');
  await page.fill('#labour-skilled-input', '9');
  await page.click('#save-override-btn');
  await page.waitForTimeout(1000);
  await capture(page, '7b_admin_override_success');

  // 8 – Email notification (we just trigger, verification is manual via MailHog UI later)
  await page.goto('http://localhost:5173/logout', { waitUntil: 'networkidle' });
  await login(page, 'engineer@sitetrack.dev', 'Engineer@123');
  await page.goto('http://localhost:5173/reports/new', { waitUntil: 'networkidle' });
  await page.selectOption('#project-select', { index: 1 });
  await page.fill('#date-picker', today);
  await page.fill('#work-done-input', 'Notify test');
  await page.fill('#labour-skilled-input', '2');
  await page.fill('#labour-unskilled-input', '2');
  await page.fill('#labour-operators-input', '1');
  await page.click('#submit-dpr-btn');
  await page.waitForTimeout(2000);
  await capture(page, '8_email_triggered');

  // 9 – Loading / error / empty states (quick sanity checks)
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await capture(page, '9a_dashboard_loaded');

  // write API log for reference
  fs.writeFileSync(path.join(OUT_DIR, 'api_log.json'), JSON.stringify(API_LOG, null, 2));

  await browser.close();
}

run().catch(err => { console.error('❌ Test script failed:', err); process.exit(1); });
