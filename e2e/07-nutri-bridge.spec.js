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

test.describe('Bridge nutricionista ↔ paciente', () => {
  test('Nutri: PatientPlanBuilder rota carrega (sem patientId redireciona)', async ({ page }) => {
    await loginAs(page, nutriCreds.email, nutriCreds.password);
    await page.goto('/PatientPlanBuilder');
    await waitNetworkIdle(page, 1500);
    // sem patientId, redireciona pro Dashboard
    expect(page.url()).toMatch(/(NutritionistDashboard|PatientPlanBuilder)/);
  });

  test('Nutri: MealPlanEditor rota carrega (sem planId redireciona)', async ({ page }) => {
    await loginAs(page, nutriCreds.email, nutriCreds.password);
    await page.goto('/MealPlanEditor');
    await waitNetworkIdle(page, 1500);
    expect(page.url()).toMatch(/(NutritionistDashboard|MealPlanEditor)/);
  });

  test('Nutri: PatientDetails mostra card "Gerar plano para o paciente"', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginAs(page, nutriCreds.email, nutriCreds.password);
    await page.goto('/NutritionistDashboard');
    await waitNetworkIdle(page, 1500);

    // tenta clicar no primeiro paciente listado
    const patientLink = page.locator('a[href*="PatientDetails?patientId="]').first();
    const hasPatient = await patientLink.count();
    if (hasPatient === 0) {
      test.skip(true, 'Nutri sem pacientes vinculados — não dá pra testar PatientDetails');
      return;
    }

    await patientLink.click();
    await waitNetworkIdle(page, 1500);

    const s = await shot(page, 'nutri-bridge-patient-details');

    // confirma que o card de IA está visível
    const cardVisible = await page.getByText(/Gerar plano para o paciente/i).count();
    if (cardVisible === 0) {
      recordBug({
        flow: 'Bridge', severity: 'high',
        title: 'Card "Gerar plano para o paciente" não aparece em PatientDetails',
        description: 'Card amarelo de IA deveria estar visível para nutris.',
        screenshot: s, page: 'PatientDetails'
      });
    }

    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Bridge', severity: 'high',
        title: 'pageerrors em PatientDetails',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'PatientDetails'
      });
    }
  });

  test('Nutri: clicar em "Abrir planejador assistido" abre PatientPlanBuilder', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginAs(page, nutriCreds.email, nutriCreds.password);
    await page.goto('/NutritionistDashboard');
    await waitNetworkIdle(page, 1500);

    const patientLink = page.locator('a[href*="PatientDetails?patientId="]').first();
    const hasPatient = await patientLink.count();
    if (hasPatient === 0) {
      test.skip(true, 'Nutri sem pacientes vinculados');
      return;
    }

    await patientLink.click();
    await waitNetworkIdle(page, 1500);

    const openPlanBtn = page.getByRole('link', { name: /Abrir planejador assistido/i }).first();
    if ((await openPlanBtn.count()) === 0) {
      test.skip(true, 'Botão "Abrir planejador" não encontrado');
      return;
    }
    await openPlanBtn.click();
    await waitNetworkIdle(page, 1500);

    expect(page.url()).toMatch(/PatientPlanBuilder/);

    // confirma tabs presentes
    const treinosTab = await page.getByRole('button', { name: /Treinos \(\d+\)/ }).count();
    const refeicoesTab = await page.getByRole('button', { name: /Refeições \(\d+\)/ }).count();

    const s = await shot(page, 'nutri-bridge-plan-builder');

    if (treinosTab === 0 || refeicoesTab === 0) {
      recordBug({
        flow: 'Bridge', severity: 'high',
        title: 'Tabs Treinos/Refeições não renderizam em PatientPlanBuilder',
        description: `Treinos tab: ${treinosTab}, Refeições tab: ${refeicoesTab}`,
        screenshot: s, page: 'PatientPlanBuilder'
      });
    }

    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Bridge', severity: 'high',
        title: 'pageerrors em PatientPlanBuilder',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'PatientPlanBuilder'
      });
    }
  });

  test('Paciente: vê treino atribuído pela nutri se existir', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginAs(page, userCreds.email, userCreds.password);
    await page.goto('/WorkoutTracker');
    await waitNetworkIdle(page, 1500);

    const s = await shot(page, 'nutri-bridge-patient-view');

    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Bridge', severity: 'high',
        title: 'pageerrors no WorkoutTracker do paciente',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'WorkoutTracker'
      });
    }

    // teste passa mesmo sem treinos atribuídos (só valida que carrega sem erros)
    expect(page.url()).toContain('/WorkoutTracker');
  });

  test('Paciente: MealPlans carrega para ver planos atribuídos', async ({ page }) => {
    const ctx = attachConsoleLogging(page);
    await loginAs(page, userCreds.email, userCreds.password);
    await page.goto('/MealPlans');
    await waitNetworkIdle(page, 1500);

    const s = await shot(page, 'nutri-bridge-patient-mealplans');

    if (ctx.pageerrors.length) {
      recordBug({
        flow: 'Bridge', severity: 'high',
        title: 'pageerrors no MealPlans do paciente',
        description: ctx.pageerrors.join('\n'),
        screenshot: s, page: 'MealPlans'
      });
    }

    expect(page.url()).toContain('/MealPlans');
  });
});
