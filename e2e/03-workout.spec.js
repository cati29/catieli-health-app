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

test.describe('Workout flow', () => {
  test('WorkoutTracker loads', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/WorkoutTracker');
    await waitNetworkIdle(page);
    const s = await shot(page, 'workout-01-tracker');
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Workout', severity: 'high',
        title: 'pageerrors on WorkoutTracker',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'WorkoutTracker',
      });
    }
  });

  test('RoutineBuilder creates a routine', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/RoutineBuilder');
    await waitNetworkIdle(page);
    const s1 = await shot(page, 'workout-02-builder');
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Workout', severity: 'high',
        title: 'pageerrors on RoutineBuilder',
        description: ctx.pageerrors.join('\n'),
        screenshot: s1, page: 'RoutineBuilder',
      });
    }
    await page.getByPlaceholder(/Treino A - Forca/i).fill('Treino QA E2E');
    await page.getByPlaceholder(/Objetivo, grupos musculares/i).fill('Teste automatizado');
    await page.getByRole('button', { name: /^Salvar rotina$/ }).click();
    await page.waitForTimeout(3500);
    const s2 = await shot(page, 'workout-03-after-save');

    const url = page.url();
    if (!/WorkoutTracker|RoutineDetail/i.test(url)) {
      recordBug({
        flow: 'Workout', severity: 'medium',
        title: 'Save routine did not navigate away',
        description: `Expected navigation to WorkoutTracker or RoutineDetail. URL: ${url}\nrequests:\n${ctx.requests.join('\n')}\nerrors:\n${ctx.pageerrors.join('\n')}`,
        screenshot: s2, page: 'RoutineBuilder',
      });
    }
  });

  test('WorkoutTracker shows newly created routine', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/WorkoutTracker');
    await waitNetworkIdle(page);
    const s = await shot(page, 'workout-04-with-routine');
    const txt = (await page.locator('body').textContent()) || '';
    if (!/Treino QA E2E/.test(txt)) {
      recordBug({
        flow: 'Workout', severity: 'high',
        title: 'Created routine does not appear in WorkoutTracker',
        description: 'After creating "Treino QA E2E" in RoutineBuilder, it should appear in WorkoutTracker active routines list. Not found.',
        screenshot: s, page: 'WorkoutTracker',
      });
    }
  });

  test('"Iniciar Treino" button has handler', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/WorkoutTracker');
    await waitNetworkIdle(page);
    const btn = page.getByRole('button', { name: /^Iniciar Treino$/ });
    if ((await btn.count()) === 0) return; // no routine -> skip
    await btn.first().click();
    await page.waitForTimeout(1500);
    const s = await shot(page, 'workout-05-iniciar-result');

    const url = page.url();
    // Per static analysis, this button has no onClick — so URL won't change and no modal opens
    if (url.endsWith('/WorkoutTracker')) {
      const modalCount = await page.locator('[role="dialog"]').count();
      if (modalCount === 0) {
        recordBug({
          flow: 'Workout', severity: 'medium',
          title: '"Iniciar Treino" button does nothing',
          description: 'Clicking "Iniciar Treino" on a routine card does not navigate, open modal, or call API. The button is a placeholder with no handler.',
          screenshot: s, page: 'WorkoutTracker',
        });
      }
    }
  });

  test('WorkoutHistory loads', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/WorkoutHistory');
    await waitNetworkIdle(page);
    const s = await shot(page, 'workout-06-history');
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Workout', severity: 'high',
        title: 'pageerrors on WorkoutHistory',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'WorkoutHistory',
      });
    }
  });

  test('ExerciseCatalog loads', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginViaUI(page);
    await page.goto('/ExerciseCatalog');
    await waitNetworkIdle(page);
    const s = await shot(page, 'workout-07-catalog');
    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Workout', severity: 'high',
        title: 'pageerrors on ExerciseCatalog',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'ExerciseCatalog',
      });
    }
  });
});
