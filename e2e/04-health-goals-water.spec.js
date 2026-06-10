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

test.describe('Home / water / goals', () => {
  test('Home page loads + +250 ml updates water count', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/Home');
    await waitNetworkIdle(page);
    const s1 = await shot(page, 'health-01-home');

    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Home', severity: 'high',
        title: 'pageerrors on Home',
        description: ctx.pageerrors.join('\n'),
        screenshot: s1, page: 'Home',
      });
    }

    const waterBtn = page.getByRole('button', { name: /^\+250 ml$/ });
    if ((await waterBtn.count()) === 0) {
      recordBug({
        flow: 'Home', severity: 'high',
        title: 'Water +250ml button not found',
        description: 'Expected button "+250 ml" on Home.',
        screenshot: s1, page: 'Home',
      });
      return;
    }
    // capture water reading before
    const beforeBody = await page.locator('body').textContent();
    await waterBtn.first().click();
    await page.waitForTimeout(2500);
    const s2 = await shot(page, 'health-02-water-added');
    const afterBody = await page.locator('body').textContent();
    // changed?
    if (beforeBody === afterBody) {
      recordBug({
        flow: 'Home', severity: 'high',
        title: 'Adding water (+250 ml) did not change page content',
        description: 'After clicking +250 ml, expected some visible update (water count, XP, progress bar). Body text identical before/after.',
        screenshot: s2, page: 'Home',
      });
    }
  });

  test('Goals page loads + edit water goal flow', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/Goals');
    await waitNetworkIdle(page);
    const s1 = await shot(page, 'health-03-goals');
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Goals', severity: 'high',
        title: 'pageerrors on Goals',
        description: ctx.pageerrors.join('\n'),
        screenshot: s1, page: 'Goals',
      });
    }
    const editBtn = page.getByRole('button', { name: /^Editar meta$/ });
    if ((await editBtn.count()) === 0) {
      recordBug({
        flow: 'Goals', severity: 'medium',
        title: '"Editar meta" button not found',
        description: 'Expected at least one "Editar meta" button on Goals page.',
        screenshot: s1, page: 'Goals',
      });
      return;
    }
    await editBtn.first().click();
    await page.waitForTimeout(400);
    const input = page.locator('#goal-water');
    if ((await input.count()) === 0) {
      recordBug({
        flow: 'Goals', severity: 'medium',
        title: 'Edit goal: water input #goal-water not visible',
        description: 'After clicking first "Editar meta", expected #goal-water input. Not found (Goals page order may differ).',
        screenshot: await shot(page, 'health-04-goals-edit-missing'),
        page: 'Goals',
      });
      return;
    }
    await input.fill('2500');
    await page.getByRole('button', { name: /^Salvar$/ }).first().click();
    await page.waitForTimeout(2500);
    const s2 = await shot(page, 'health-05-goals-saved');
    const txt = (await page.locator('body').textContent()) || '';
    if (!/2500/.test(txt)) {
      recordBug({
        flow: 'Goals', severity: 'high',
        title: 'Updated water goal does not appear after save',
        description: 'Saved water goal of 2500 ml. Expected "2500" or "2.5L" somewhere on Goals page after refetch. Not found.',
        screenshot: s2, page: 'Goals',
      });
    }
  });

  test('HealthData page loads', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/HealthData');
    await waitNetworkIdle(page);
    const s = await shot(page, 'health-06-healthdata');
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'HealthData', severity: 'high',
        title: 'pageerrors on HealthData',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'HealthData',
      });
    }
  });

  test('Achievements page loads', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/Achievements');
    await waitNetworkIdle(page);
    const s = await shot(page, 'health-07-achievements');
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Achievements', severity: 'high',
        title: 'pageerrors on Achievements',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'Achievements',
      });
    }
  });

  test('Profile page loads', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/Profile');
    await waitNetworkIdle(page);
    const s = await shot(page, 'health-08-profile');
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Profile', severity: 'high',
        title: 'pageerrors on Profile',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'Profile',
      });
    }
  });
});
