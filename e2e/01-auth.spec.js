import { test, expect } from '@playwright/test';
import { attachConsoleLogging, recordBug, shot, waitNetworkIdle, uniqueEmail } from './_helpers.js';
import fs from 'fs';
import path from 'path';

const creds = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'e2e/.test-creds.json'), 'utf8'));

test.describe('Auth flow', () => {
  test('login screen renders without console errors', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await page.goto('/Login');
    await waitNetworkIdle(page);

    const s = await shot(page, '01-login-screen');

    const heading = await page.getByRole('heading', { name: /Entrar/i }).count();
    if (heading === 0) {
      recordBug({
        flow: 'Auth', severity: 'high',
        title: 'Login heading not found',
        description: 'Heading "Entrar" missing on /Login.',
        screenshot: s, page: 'Login',
      });
    }

    if (ctx.pageerrors.length || ctx.errors.length) {
      recordBug({
        flow: 'Auth', severity: 'high',
        title: 'Console errors on Login page load',
        description: 'pageerrors:\n```\n' + ctx.pageerrors.join('\n') + '\n```\nconsole.error:\n```\n' + ctx.errors.join('\n') + '\n```',
        screenshot: s, page: 'Login',
      });
    }
  });

  test('login with wrong password shows error', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await page.goto('/Login');
    await waitNetworkIdle(page);
    await page.getByPlaceholder('seu@email.com').fill(creds.email);
    await page.getByPlaceholder('********').fill('wrong-password');
    await page.getByRole('button', { name: /^Entrar$/ }).click();
    await page.waitForTimeout(2500);
    const s = await shot(page, '02-login-wrong-pass');

    const hasError = (await page.locator('p.text-red-500').count()) > 0;
    if (!hasError) {
      recordBug({
        flow: 'Auth', severity: 'high',
        title: 'Wrong password did not show error',
        description: 'After clicking "Entrar" with wrong password, expected red error text. None visible.',
        screenshot: s, page: 'Login',
      });
    }
  });

  test('login with correct credentials redirects to Home', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await page.goto('/Login');
    await waitNetworkIdle(page);
    await page.getByPlaceholder('seu@email.com').fill(creds.email);
    await page.getByPlaceholder('********').fill(creds.password);
    await page.getByRole('button', { name: /^Entrar$/ }).click();
    await page.waitForTimeout(5000);
    const s = await shot(page, '03-after-login');

    const url = page.url();
    const isHome = /\/Home/.test(url) || url.endsWith('/');
    if (!isHome) {
      recordBug({
        flow: 'Auth', severity: 'high',
        title: 'Login did not navigate to Home',
        description: `Current URL after login: ${url}\npageerrors:\n${ctx.pageerrors.join('\n')}\nconsole errors:\n${ctx.errors.join('\n')}\nfailed requests:\n${ctx.requests.join('\n')}`,
        screenshot: s, page: 'Login',
      });
    }

    // Save auth state for subsequent tests
    await page.context().storageState({ path: 'e2e/.auth-state.json' });
  });

  test('register: walks through all 5 user steps and submits', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    const email = uniqueEmail('register');
    await page.goto('/Register');
    await waitNetworkIdle(page);

    // step 1
    await page.getByPlaceholder('Seu nome').fill('QA');
    await page.getByPlaceholder('Seu sobrenome').fill('Tester');
    await page.getByRole('button', { name: /^Continuar$/ }).click();

    // step 2
    await page.getByPlaceholder('seu@email.com').fill(email);
    await page.getByPlaceholder('(00) 00000-0000').fill('11999999999');
    await page.getByRole('button', { name: /^Continuar$/ }).click();

    // step 3
    await page.getByPlaceholder('25').fill('30');
    await page.getByPlaceholder('Sua cidade').fill('São Paulo');
    await page.getByPlaceholder('170').fill('175');
    await page.getByPlaceholder('70', { exact: true }).fill('72');
    await page.getByRole('button', { name: /^Continuar$/ }).click();

    // step 4
    const pwd = 'TestPwd!123';
    const pwdInputs = page.locator('input[type="password"]');
    await pwdInputs.nth(0).fill(pwd);
    await pwdInputs.nth(1).fill(pwd);
    await page.getByRole('button', { name: /^Continuar$/ }).click();

    // step 5 (goal) - default is 'health'
    await page.waitForTimeout(500);
    const s1 = await shot(page, '04-register-step5');
    await page.getByRole('button', { name: /^Criar conta$/ }).click();

    // wait for either confirmation screen or signup error
    await page.waitForTimeout(5000);
    const s2 = await shot(page, '05-register-result');

    const confirmHeading = await page.getByRole('heading', { name: /Confirme seu email/i }).count();
    const hasError = (await page.locator('p.text-red-500').count()) > 0;
    if (confirmHeading === 0 && !page.url().endsWith('/Home')) {
      recordBug({
        flow: 'Auth', severity: hasError ? 'medium' : 'high',
        title: 'Register did not complete successfully',
        description: `After clicking "Criar conta", expected confirmation screen or Home redirect. URL: ${page.url()}\nemail used: ${email}\npageerrors:\n${ctx.pageerrors.join('\n')}\nconsole errors:\n${ctx.errors.join('\n')}\nfailed requests:\n${ctx.requests.join('\n')}`,
        screenshot: s2, page: 'Register',
      });
    }
  });
});
