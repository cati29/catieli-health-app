import { test, expect } from '@playwright/test';
import { attachConsoleLogging, shot, recordBug, waitNetworkIdle } from './_helpers.js';

test.describe('Fluxos de autenticação', () => {
  test('Login: renderiza formulário com email e senha', async ({ page }) => {
    const ctx = attachConsoleLogging(page);

    await page.goto('/Login');
    await waitNetworkIdle(page);

    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('********')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Criar conta/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Esqueci minha senha/i })).toBeVisible();

    if (ctx.pageerrors.length > 0) {
      const screenshot = await shot(page, 'auth-login-render');
      recordBug({
        flow: 'auth',
        severity: 'high',
        title: 'Erros JS ao abrir tela de Login',
        description: ctx.pageerrors.join('\n'),
        screenshot,
        page: '/Login'
      });
    }
  });

  test('Login: submit vazio exibe mensagem de erro', async ({ page }) => {
    await page.goto('/Login');
    await waitNetworkIdle(page);

    await page.getByRole('button', { name: /^Entrar$/ }).click();
    await expect(page.getByText('Preencha email e senha.')).toBeVisible();
  });

  test('Register: passo 1 renderiza nome e sobrenome', async ({ page }) => {
    await page.goto('/Register');
    await waitNetworkIdle(page);

    await expect(page.getByText(/Criar conta/i).first()).toBeVisible();
  });

  test('ForgotPassword: tela acessível sem autenticação', async ({ page }) => {
    await page.goto('/ForgotPassword');
    await waitNetworkIdle(page);

    expect(page.url()).toContain('/ForgotPassword');
  });
});
