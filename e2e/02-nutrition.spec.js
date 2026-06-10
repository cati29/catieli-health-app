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

test.describe('Nutrition flow', () => {
  test('NutritionTracker page loads + opens add food dialog', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/NutritionTracker');
    await waitNetworkIdle(page);
    const s1 = await shot(page, 'nutri-01-page');

    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Nutrition', severity: 'high',
        title: 'Console errors on NutritionTracker load',
        description: 'pageerrors:\n```\n' + ctx.pageerrors.join('\n') + '\n```',
        screenshot: s1, page: 'NutritionTracker',
      });
    }

    const addBtn = page.getByRole('button', { name: /Adicionar alimento/i });
    if ((await addBtn.count()) === 0) {
      recordBug({
        flow: 'Nutrition', severity: 'high',
        title: 'Add food button missing',
        description: 'Expected button "Adicionar alimento" not found.',
        screenshot: s1, page: 'NutritionTracker',
      });
      return;
    }
    await addBtn.first().click();
    await page.waitForTimeout(800);
    const s2 = await shot(page, 'nutri-02-dialog');

    const search = page.getByPlaceholder('Buscar alimento...');
    if ((await search.count()) === 0) {
      recordBug({
        flow: 'Nutrition', severity: 'high',
        title: 'Add food dialog did not open',
        description: 'After clicking "Adicionar alimento", search input not visible.',
        screenshot: s2, page: 'NutritionTracker',
      });
    }
  });

  test('search food + add entry + verify it appears', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/NutritionTracker');
    await waitNetworkIdle(page);
    await page.getByRole('button', { name: /Adicionar alimento/i }).first().click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder('Buscar alimento...').fill('Frango');
    await page.waitForTimeout(1500);
    const s1 = await shot(page, 'nutri-03-search-results');

    const results = page.locator('button').filter({ hasText: /Frango/i });
    const count = await results.count();
    if (count === 0) {
      recordBug({
        flow: 'Nutrition', severity: 'high',
        title: 'Food search returned no results for "Frango"',
        description: 'Searched for "Frango" — expected at least one match (Peito de frango grelhado is seeded in food_database). No buttons containing "Frango" found.',
        screenshot: s1, page: 'NutritionTracker',
      });
      return;
    }
    // click the first matching food result
    await results.first().click();
    await page.waitForTimeout(500);
    const s2 = await shot(page, 'nutri-04-food-selected');

    // submit
    const submitBtn = page.getByRole('button', { name: /^Adicionar$/ });
    if ((await submitBtn.count()) === 0) {
      recordBug({
        flow: 'Nutrition', severity: 'high',
        title: 'Could not find "Adicionar" button to submit food entry',
        description: 'After selecting a food, expected an "Adicionar" submit button.',
        screenshot: s2, page: 'NutritionTracker',
      });
      return;
    }
    await submitBtn.first().click();
    await page.waitForTimeout(3000);
    const s3 = await shot(page, 'nutri-05-after-add');

    // verify food appears on page
    const pageText = await page.locator('body').textContent();
    if (!/Frango/i.test(pageText || '')) {
      recordBug({
        flow: 'Nutrition', severity: 'high',
        title: 'Added food entry does not appear on NutritionTracker',
        description: 'After adding "Frango", expected its name to appear on page. Not found.',
        screenshot: s3, page: 'NutritionTracker',
      });
    }

    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Nutrition', severity: 'medium',
        title: 'Console errors during food add',
        description: 'pageerrors:\n' + ctx.pageerrors.join('\n') + '\nrequests:\n' + ctx.requests.join('\n'),
        screenshot: s3, page: 'NutritionTracker',
      });
    }
  });

  test('Progress page reflects nutrition activity', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/Progress');
    await waitNetworkIdle(page);
    const s = await shot(page, 'nutri-06-progress');

    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Nutrition', severity: 'high',
        title: 'Console errors on Progress page',
        description: 'pageerrors:\n```\n' + ctx.pageerrors.join('\n') + '\n```',
        screenshot: s, page: 'Progress',
      });
    }

    const hasContent = await page.locator('text=/Progresso|Conclusão|Água|Exercício/i').count();
    if (hasContent === 0) {
      recordBug({
        flow: 'Nutrition', severity: 'medium',
        title: 'Progress page does not show expected sections',
        description: 'Expected text like "Progresso", "Conclusão", "Água", "Exercício" — none found.',
        screenshot: s, page: 'Progress',
      });
    }
  });
});
