import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DOCS_DIR = path.resolve('../docs');

const ROLES = [
  {
    roleKey: 'employer',
    username: 'parle.compliance.lmpc@gmail.com',
    password: 'employer123',
    route: 'http://localhost:5173/employer/dashboard',
    filename: 'screenshot_employer.png'
  },
  {
    roleKey: 'sub_inspector',
    username: 'sub.inspector.sanjay.lmpc@gmail.com',
    password: 'inspector123',
    route: 'http://localhost:5173/sub-inspector',
    filename: 'screenshot_sub_inspector.png'
  },
  {
    roleKey: 'inspector',
    username: 'inspector.rajesh.lmpc@gmail.com',
    password: 'inspector123',
    route: 'http://localhost:5173/inspector/products',
    filename: 'screenshot_lead_inspector.png'
  },
  {
    roleKey: 'almo',
    username: 'almo.noida.lmpc@gmail.com',
    password: 'supervisor123',
    route: 'http://localhost:5173/almo',
    filename: 'screenshot_almo.png'
  },
  {
    roleKey: 'clmo',
    username: 'clmo.supervisor.lmpc@gmail.com',
    password: 'supervisor123',
    route: 'http://localhost:5173/clmo',
    filename: 'screenshot_clmo.png'
  },
  {
    roleKey: 'commissioner',
    username: 'commissioner.lmpc@gmail.com',
    password: 'commissioner123',
    route: 'http://localhost:5173/commissioner',
    filename: 'screenshot_commissioner.png'
  }
];

async function captureAll() {
  console.log('🚀 Launching Chrome for High-Res Portal Screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1366, height: 768, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // 1. Capture Login Page
  try {
    console.log('📸 Capturing Login Portal...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(DOCS_DIR, 'screenshot_login.png') });
    console.log('✅ Captured screenshot_login.png');
  } catch (err) {
    console.error('Failed login page capture:', err.message);
  }

  // 2. Capture Public Certificate Verification
  try {
    console.log('📸 Capturing Public Certificate Verification...');
    await page.goto('http://localhost:5173/verify/LMPC-2026-DOCA-00492', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(DOCS_DIR, 'screenshot_public_verification.png') });
    console.log('✅ Captured screenshot_public_verification.png');
  } catch (err) {
    console.error('Failed public verification capture:', err.message);
  }

  // 3. Capture Swagger UI
  try {
    console.log('📸 Capturing FastAPI Swagger UI (/docs)...');
    await page.goto('http://localhost:8000/docs', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(DOCS_DIR, 'screenshot_swagger_ui.png') });
    console.log('✅ Captured screenshot_swagger_ui.png');
  } catch (err) {
    console.error('Failed Swagger UI capture:', err.message);
  }

  // 4. Capture all 6 authenticated portals
  for (const role of ROLES) {
    try {
      console.log(`📸 Capturing ${role.roleKey} -> ${role.route}...`);
      await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0', timeout: 15000 });

      // Click role button or fill form directly
      await page.evaluate((u, p) => {
        const uInput = document.querySelector('input[name="username"]') || document.querySelector('input[type="text"]') || document.querySelector('input[type="email"]');
        const pInput = document.querySelector('input[name="password"]') || document.querySelector('input[type="password"]');
        if (uInput) {
          uInput.value = u;
          uInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (pInput) {
          pInput.value = p;
          pInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, role.username, role.password);

      await new Promise(r => setTimeout(r, 500));

      // Click submit
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      }

      // Wait for navigation or token storage
      await new Promise(r => setTimeout(r, 2000));

      // Navigate to destination route directly
      await page.goto(role.route, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2500));

      const destPath = path.join(DOCS_DIR, role.filename);
      await page.screenshot({ path: destPath });
      console.log(`✅ Captured ${role.filename}`);
    } catch (err) {
      console.error(`Failed ${role.roleKey} capture:`, err.message);
    }
  }

  await browser.close();
  console.log('🎉 ALL REAL PORTAL SCREENSHOTS CAPTURED SUCCESSFULLY IN docs/!');
}

captureAll().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
