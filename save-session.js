/**
 * save-session.js
 *
 * Run this ONCE to log into ByteByteGo manually in a visible browser window.
 * After you complete the OTP login, press Enter in the terminal to save the session.
 * The saved session.json will be used by the scraper for all subsequent requests.
 *
 * Usage:
 *   node save-session.js
 */

const { chromium } = require('playwright');
const path = require('path');
const readline = require('readline');

const SESSION_FILE = path.resolve(__dirname, 'session.json');

async function main() {
  console.log('Launching browser for manual login...');
  console.log('Please log in to ByteByteGo (including OTP), then press Enter here.');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://bytebytego.com/my-courses');

  // Wait for user to complete login
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => {
    rl.question('\nPress Enter AFTER you have fully logged in and can see your courses... ', () => {
      rl.close();
      resolve();
    });
  });

  // Save session state (cookies + localStorage)
  await context.storageState({ path: SESSION_FILE });
  console.log(`\nSession saved to: ${SESSION_FILE}`);
  console.log('You can now run: npm run scrape');

  await browser.close();
}

main().catch(err => {
  console.error('Error saving session:', err);
  process.exit(1);
});
