import { test, expect } from '@playwright/test';
import { attachConsoleLogging, shot, recordBug, waitNetworkIdle } from './_helpers.js';

test.describe('Smoke do bundle', () => {
  test('App monta sem erros críticos de console', async ({ page }) => {
    const ctx = attachConsoleLogging(page);

    await page.goto('/Login');
    await waitNetworkIdle(page, 1000);

    const criticalErrors = ctx.pageerrors.filter(
      (msg) => !msg.includes('ResizeObserver') && !msg.includes('favicon')
    );

    if (criticalErrors.length > 0) {
      const screenshot = await shot(page, 'smoke-bundle-errors');
      recordBug({
        flow: 'smoke',
        severity: 'high',
        title: 'Erros JS críticos no bootstrap',
        description: criticalErrors.join('\n'),
        screenshot,
        page: '/'
      });
    }

    expect(criticalErrors).toEqual([]);
  });

  test('Logo do app é renderizado na tela de Login', async ({ page }) => {
    await page.goto('/Login');
    await waitNetworkIdle(page);

    await expect(page.locator('svg, img').first()).toBeVisible();
  });
});
