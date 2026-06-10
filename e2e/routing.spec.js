import { test, expect } from '@playwright/test';
import { waitNetworkIdle } from './_helpers.js';

test.describe('Proteção de rotas', () => {
  const protectedRoutes = ['/Home', '/Goals', '/Achievements', '/HealthData', '/Profile'];

  for (const route of protectedRoutes) {
    test(`${route} sem autenticação redireciona para Login`, async ({ page }) => {
      await page.goto(route);
      await waitNetworkIdle(page);

      expect(page.url()).toMatch(/\/Login/);
      expect(page.url()).toContain('from_url=');
    });
  }

  test('Raiz / redireciona para Login quando não autenticado', async ({ page }) => {
    await page.goto('/');
    await waitNetworkIdle(page);

    expect(page.url()).toMatch(/\/Login/);
  });
});
