// audit_sitesphere.mjs – Playwright audit for console & network errors
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('audit-output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const credentials = {
  engineer: { email: 'engineer@sitetrack.dev', password: 'Engineer@123' },
  pm: { email: 'pm@sitetrack.dev', password: 'PM@123' },
  admin: { email: 'admin@sitetrack.dev', password: 'Admin@123' },
};

async function auditRole(page, role, cred) {
  const result = { role, console: [], network: [] };
  // capture console errors/warnings
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      result.console.push({ type, text: msg.text() });
    }
  });
  // capture failing network responses
  page.on('response', async resp => {
    const status = resp.status();
    if (status >= 400) {
      result.network.push({ url: resp.url(), status });
    }
  });

  // ensure fresh auth state
  await page.context().clearCookies();
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#login-email', cred.email);
  await page.fill('#login-password', cred.password);
  await page.click('#login-submit-btn');

  const screens = [
    '/dashboard',
    '/reports',
    '/reports/new',
    '/admin/projects',
    '/admin/users',
    '/admin/audit',
  ];
  for (const s of screens) {
    try {
      await page.goto(`http://localhost:5173${s}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
    } catch (e) {}
  }
  // logout before next role
  try { await page.goto('http://localhost:5173/logout', { waitUntil: 'networkidle' }); } catch {}
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const auditResults = [];
  for (const [role, cred] of Object.entries(credentials)) {
    const r = await auditRole(page, role, cred);
    auditResults.push(r);
  }
  await browser.close();
  const outFile = path.join(OUT_DIR, 'audit_results.json');
  fs.writeFileSync(outFile, JSON.stringify(auditResults, null, 2));
  console.log('✅ audit completed', outFile);
})();
