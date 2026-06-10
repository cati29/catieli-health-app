import { test, expect } from '@playwright/test';
import { attachConsoleLogging, recordBug, shot, waitNetworkIdle } from './_helpers.js';
import fs from 'fs';

const nutriCreds = { email: 'nutri_1781051668@catieli.test', password: 'TestPwd!123' };
const userCreds = JSON.parse(fs.readFileSync('e2e/.test-creds.json', 'utf8'));

async function loginAs(page, email, password) {
  await page.goto('/Login');
  await waitNetworkIdle(page);
  await page.getByPlaceholder('seu@email.com').fill(email);
  await page.getByPlaceholder('********').fill(password);
  await page.getByRole('button', { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/(Home|NutritionistDashboard|$)/, { timeout: 15000 }).catch(() => {});
  await waitNetworkIdle(page);
}

test.describe('Nutritionist flow', () => {
  test('Nutritionist login + sidebar shows correct nav', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginAs(page, nutriCreds.email, nutriCreds.password);
    const s = await shot(page, 'nutri-flow-01-home');

    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Nutritionist', severity: 'high',
        title: 'pageerrors after nutritionist login',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'Home',
      });
    }

    // user lands on Home (mainPage), but should be redirected to NutritionistDashboard?
    const url = page.url();
    if (!/NutritionistDashboard/.test(url)) {
      // not a bug per design — but worth flagging if home doesn't show nutritionist-specific UI
      const body = (await page.locator('body').textContent()) || '';
      if (!/Dashboard|Atendimento/i.test(body)) {
        recordBug({
          flow: 'Nutritionist', severity: 'low',
          title: 'After nutritionist login, lands on user Home (not Dashboard)',
          description: `Landing URL: ${url}. App routes mainPage = "Home" for all users including nutritionists. The Layout swaps nav sections but the Home page itself still renders user-centric widgets (water, missions). Consider redirecting nutritionists to NutritionistDashboard or providing a different home view.`,
          screenshot: s, page: 'Home',
        });
      }
    }
  });

  test('NutritionistDashboard loads', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginAs(page, nutriCreds.email, nutriCreds.password);
    await page.goto('/NutritionistDashboard');
    await waitNetworkIdle(page, 1500);
    const s = await shot(page, 'nutri-flow-02-dashboard');
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Nutritionist', severity: 'high',
        title: 'pageerrors on NutritionistDashboard',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'NutritionistDashboard',
      });
    }
    const body = (await page.locator('body').textContent()) || '';
    if (body.trim().length < 50) {
      recordBug({
        flow: 'Nutritionist', severity: 'high',
        title: 'NutritionistDashboard renders blank',
        description: 'Body text under 50 chars',
        screenshot: s, page: 'NutritionistDashboard',
      });
    }
  });

  test('NutritionistProfile + PatientGoalManager + PatientDetails routes load', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginAs(page, nutriCreds.email, nutriCreds.password);
    for (const pageName of ['NutritionistProfile', 'PatientGoalManager', 'PatientDetails']) {
      await page.goto(`/${pageName}`);
      await waitNetworkIdle(page, 1500);
      const s = await shot(page, `nutri-flow-${pageName}`);
      if (ctx.pageerrors.length) {
        recordBug({
          flow: 'Nutritionist', severity: 'high',
          title: `pageerrors on ${pageName}`,
          description: ctx.pageerrors.join('\n'),
          screenshot: s, page: pageName,
        });
        ctx.pageerrors.length = 0;
      }
    }
  });

  test('Nutricionistas list (as user) shows nutritionist created via admin API', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginAs(page, userCreds.email, userCreds.password);
    await page.goto('/Nutritionists');
    await waitNetworkIdle(page, 1500);
    const s = await shot(page, 'nutri-flow-list-as-user');
    const body = (await page.locator('body').textContent()) || '';
    if (!/Dra Nutri/i.test(body) && /Nenhum resultado/i.test(body)) {
      recordBug({
        flow: 'Nutritionist', severity: 'high',
        title: 'Created nutritionist profile does not appear in Nutritionists list',
        description: 'Created a nutritionist (Dra Nutri) via admin API + user_profile insert. Logged in as a user and visited /Nutritionists. The professional is not listed. Likely cause: list filters by additional criteria (e.g., is_verified, has_specialty, etc.) not satisfied by minimal seeded profile.',
        screenshot: s, page: 'Nutritionists',
      });
    }
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Nutritionist', severity: 'high',
        title: 'pageerrors on Nutritionists',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'Nutritionists',
      });
    }
  });
});
