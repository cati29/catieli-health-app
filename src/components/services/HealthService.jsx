import { appClient } from '@/api/appClient';
import { format } from 'date-fns';
import { AntiCheatService } from '@/components/services/AntiCheatService';

/**
 * HealthService - Microsserviço de Dados de Saúde
 * Integra wearables, dados de saúde e métricas biométricas
 */
export const HealthService = {
  /**
   * Salva dados de saúde do dia (wearable ou manual)
   */
  async saveHealthData(userId, data, source = 'manual') {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = await appClient.entities.HealthData.filter({ user_id: userId, date: today });
    const mergedCandidate = {
      ...(existing?.[0] || {}),
      ...(data || {})
    };
    const antiCheatReport = AntiCheatService.evaluateHealthPayload(mergedCandidate, {
      previousPayload: existing?.[0] || null,
      source
    });

    const payload = {
      user_id: userId,
      date: today,
      source,
      trust_score: antiCheatReport.reliabilityScore,
      trust_tier: antiCheatReport.trustTier,
      source_confidence: antiCheatReport.sourceConfidence,
      anomaly_flags: antiCheatReport.anomalies.map((item) => item.code),
      anti_cheat_blocked: antiCheatReport.blocked,
      reward_multiplier: antiCheatReport.rewardMultiplier,
      ...data
    };

    if (existing[0]) {
      const updated = await appClient.entities.HealthData.update(existing[0].id, {
        ...payload,
        __expected_updated_date: existing[0].updated_date
      });
      await AntiCheatService.saveTrustAssessment(userId, antiCheatReport).catch(() => null);
      return updated;
    }
    const created = await appClient.entities.HealthData.create(payload);
    await AntiCheatService.saveTrustAssessment(userId, antiCheatReport).catch(() => null);
    return created;
  },

  async getTodayData(userId) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const data = await appClient.entities.HealthData.filter({ user_id: userId, date: today });
    return data[0] || null;
  },

  async getHistory(userId, days = 7) {
    const all = await appClient.entities.HealthData.filter({ user_id: userId });
    return all
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, days);
  },

  async getReliabilitySummary(userId, days = 14) {
    const history = await HealthService.getHistory(userId, days);
    if (!history.length) {
      return {
        avg_trust_score: 100,
        reliability_multiplier: 1,
        low_trust_days: 0
      };
    }

    const trustScores = history.map((item) => Number(item.trust_score || 100));
    const avgTrustScore = Math.round(
      trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length
    );
    const lowTrustDays = history.filter((item) => Number(item.trust_score || 100) < 65).length;

    return {
      avg_trust_score: avgTrustScore,
      reliability_multiplier: Math.min(1.05, Math.max(0.25, avgTrustScore / 100)),
      low_trust_days: lowTrustDays
    };
  },

  /**
   * Calcula IMC e retorna categoria
   */
  calculateIMC(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    const heightM = heightCm / 100;
    const imc = weightKg / (heightM * heightM);
    return {
      value: Math.round(imc * 10) / 10,
      category: HealthService._imcCategory(imc),
      color: HealthService._imcColor(imc)
    };
  },

  _imcCategory(imc) {
    if (imc < 18.5) return 'Abaixo do peso';
    if (imc < 25)   return 'Peso normal';
    if (imc < 30)   return 'Sobrepeso';
    if (imc < 35)   return 'Obesidade Grau I';
    if (imc < 40)   return 'Obesidade Grau II';
    return 'Obesidade Grau III';
  },

  _imcColor(imc) {
    if (imc < 18.5) return 'text-blue-500';
    if (imc < 25)   return 'text-green-500';
    if (imc < 30)   return 'text-yellow-500';
    return 'text-red-500';
  },

  /**
   * Calcula métricas semanais agregadas
   */
  async getWeeklyAggregates(userId) {
    const history = await HealthService.getHistory(userId, 7);
    if (!history.length) return null;

    const avg = (arr, key) => {
      const vals = arr.filter(d => d[key] != null).map(d => d[key]);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    };

    return {
      avg_steps: avg(history, 'steps'),
      avg_heart_rate: avg(history, 'heart_rate_avg'),
      avg_sleep: avg(history, 'sleep_hours'),
      total_calories: history.reduce((sum, d) => sum + (d.calories_burned || 0), 0),
      total_active_minutes: history.reduce((sum, d) => sum + (d.active_minutes || 0), 0),
      days_with_data: history.length
    };
  },

  /**
   * Conecta dispositivo wearable e cria dados de hoje simulados
   */
  async connectWearable(userId, profileId, deviceType) {
    await appClient.entities.UserProfile.update(profileId, {
      wearable_data: {
        connected: true,
        device_type: deviceType,
        last_sync: new Date().toISOString()
      }
    });

    // Cria dados iniciais do dia
    await HealthService.saveHealthData(userId, {
      steps: Math.floor(3000 + Math.random() * 5000),
      distance_km: Math.round((Math.random() * 5 + 1) * 10) / 10,
      calories_burned: Math.floor(200 + Math.random() * 300),
      heart_rate_avg: Math.floor(65 + Math.random() * 20),
      heart_rate_min: 58,
      heart_rate_max: Math.floor(120 + Math.random() * 40),
      sleep_hours: Math.round((6 + Math.random() * 3) * 10) / 10,
      sleep_quality: ['good', 'excellent', 'fair'][Math.floor(Math.random() * 3)],
      active_minutes: Math.floor(20 + Math.random() * 60),
    }, deviceType.toLowerCase().replace(' ', '_'));

    return { success: true };
  },

  async syncWearable(userId, profileId) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = await appClient.entities.HealthData.filter({ user_id: userId, date: today });

    const updates = {
      steps: (existing[0]?.steps || 0) + Math.floor(500 + Math.random() * 1000),
      calories_burned: (existing[0]?.calories_burned || 0) + Math.floor(50 + Math.random() * 100),
      active_minutes: (existing[0]?.active_minutes || 0) + Math.floor(5 + Math.random() * 20),
    };

    await HealthService.saveHealthData(userId, updates);
    await appClient.entities.UserProfile.update(profileId, {
      wearable_data: {
        ...(await appClient.entities.UserProfile.filter({ created_by: userId }))[0]?.wearable_data,
        last_sync: new Date().toISOString()
      }
    });

    return updates;
  }
};

export default HealthService;
