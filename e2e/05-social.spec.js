import { test, expect } from '@playwright/test';
import { attachConsoleLogging, recordBug, shot, waitNetworkIdle } from './_helpers.js';
import fs from 'fs';
import path from 'path';

const creds = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'e2e/.test-creds.json'), 'utf8'));

async function loginViaUI(page) {
  await page.goto('/Login');
  await waitNetworkIdle(page);
  await page.getByPlaceholder('seu@email.com').fill(creds.email);
  await page.getByPlaceholder('********').fill(creds.password);
  await page.getByRole('button', { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/(Home|$)/, { timeout: 15000 }).catch(() => {});
  await waitNetworkIdle(page);
}

const SOCIAL_PAGES = [
  'SocialFeed',
  'Groups',
  'Chat',
  'Leaderboard',
  'Nutritionists',
  'Plans',
  'MealPlans',
  'AIWorkoutSuggestions',
  'AppUpdates',
  'NotificationSettings',
];

for (const pageName of SOCIAL_PAGES) {
  test(`${pageName} loads without console errors`, async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto(`/${pageName}`);
    await waitNetworkIdle(page, 1500);
    const s = await shot(page, `social-${pageName}`);
    if (ctx.pageerrors.length) {
      recordBug({
        flow: pageName, severity: 'high',
        title: `pageerrors on ${pageName}`,
        description: 'pageerrors:\n```\n' + ctx.pageerrors.join('\n') + '\n```\nfailed requests:\n' + ctx.requests.join('\n'),
        screenshot: s, page: pageName,
      });
    }
    // also check we're not on a blank page
    const bodyText = (await page.locator('body').textContent()) || '';
    if (bodyText.trim().length < 50) {
      recordBug({
        flow: pageName, severity: 'high',
        title: `${pageName} renders nearly blank`,
        description: `Body text length: ${bodyText.trim().length}. Suggests page failed to render content.`,
        screenshot: s, page: pageName,
      });
    }
  });
}
