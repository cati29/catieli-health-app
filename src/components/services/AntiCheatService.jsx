import { appClient } from '@/api/appClient';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const SOURCE_CONFIDENCE = {
  wearable: 0.96,
  apple_health: 0.94,
  google_fit: 0.92,
  fitbit: 0.95,
  garmin: 0.95,
  samsung_health: 0.9,
  manual: 0.55,
  unknown: 0.5
};

const severityPenalty = {
  low: 8,
  medium: 18,
  high: 34,
  critical: 60
};

const tierFromScore = (score) => {
  if (score >= 85) return 'high';
  if (score >= 65) return 'medium';
  if (score >= 45) return 'low';
  return 'critical';
};

const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeSource = (source) => String(source || 'unknown').toLowerCase();

export const AntiCheatService = {
  getSourceConfidence(source) {
    const key = normalizeSource(source);
    return SOURCE_CONFIDENCE[key] ?? SOURCE_CONFIDENCE.unknown;
  },

  evaluateHealthPayload(payload = {}, { previousPayload = null, source = 'unknown' } = {}) {
    const anomalies = [];

    const steps = safeNumber(payload.steps);
    const distanceKm = safeNumber(payload.distance_km);
    const activeMinutes = safeNumber(payload.active_minutes);
    const sleepHours = safeNumber(payload.sleep_hours);
    const caloriesBurned = safeNumber(payload.calories_burned);
    const hrAvg = safeNumber(payload.heart_rate_avg);

    const prevSteps = safeNumber(previousPayload?.steps);
    const prevActiveMinutes = safeNumber(previousPayload?.active_minutes);

    if (steps > 120000) {
      anomalies.push({
        code: 'steps_impossible',
        severity: 'critical',
        message: 'Passos acima de limite fisiológico diário.',
        blocksReward: true
      });
    } else if (steps > 70000) {
      anomalies.push({
        code: 'steps_extreme',
        severity: 'high',
        message: 'Passos muito acima do padrao.',
        blocksReward: false
      });
    }

    if (previousPayload && steps - prevSteps > 40000) {
      anomalies.push({
        code: 'steps_spike',
        severity: 'high',
        message: 'Pico de passos incoerente em curto intervalo.',
        blocksReward: false
      });
    }

    if (activeMinutes > 1080 || (previousPayload && activeMinutes - prevActiveMinutes > 420)) {
      anomalies.push({
        code: 'active_minutes_spike',
        severity: 'medium',
        message: 'Minutos ativos com crescimento abrupto.',
        blocksReward: false
      });
    }

    if (distanceKm > 120) {
      anomalies.push({
        code: 'distance_impossible',
        severity: 'critical',
        message: 'Distância diária irreal para atividade humana.',
        blocksReward: true
      });
    }

    if (sleepHours > 16 || sleepHours < 0) {
      anomalies.push({
        code: 'sleep_invalid',
        severity: 'high',
        message: 'Horas de sono fora de faixa valida.',
        blocksReward: false
      });
    }

    if (hrAvg && (hrAvg < 35 || hrAvg > 210)) {
      anomalies.push({
        code: 'heart_rate_invalid',
        severity: 'high',
        message: 'Frequência cardíaca média em faixa improvável.',
        blocksReward: false
      });
    }

    if (caloriesBurned > 7000) {
      anomalies.push({
        code: 'calories_extreme',
        severity: 'medium',
        message: 'Calorias queimadas acima de faixa esperada.',
        blocksReward: false
      });
    }

    const normalizedSource = normalizeSource(source);
    if (normalizedSource === 'manual' && steps > 35000) {
      anomalies.push({
        code: 'manual_high_steps',
        severity: 'high',
        message: 'Entrada manual com passos muito elevados.',
        blocksReward: false
      });
    }

    const sourceConfidence = this.getSourceConfidence(source);
    const anomalyPenalty = anomalies.reduce(
      (sum, item) => sum + (severityPenalty[item.severity] || 10),
      0
    );
    const reliabilityScore = clamp(Math.round(sourceConfidence * 100 - anomalyPenalty), 0, 100);
    const trustTier = tierFromScore(reliabilityScore);
    const blocked = anomalies.some((a) => a.blocksReward);
    const rewardMultiplier = blocked
      ? 0
      : clamp(reliabilityScore / 100, 0.2, 1.05);

    return {
      source: normalizedSource,
      sourceConfidence,
      reliabilityScore,
      trustTier,
      blocked,
      rewardMultiplier,
      anomalies
    };
  },

  async saveTrustAssessment(userId, report) {
    if (!userId || !report) return null;
    const profiles = await appClient.entities.UserProfile.filter(
      { created_by: userId },
      '-created_date',
      1
    );
    const profile = profiles?.[0];
    if (!profile) return null;

    const state = profile?.anti_cheat_state || {};
    const history = Array.isArray(state.history) ? state.history : [];
    const nextHistory = [
      ...history.slice(-39),
      {
        at: new Date().toISOString(),
        source: report.source,
        score: report.reliabilityScore,
        tier: report.trustTier,
        anomalies: report.anomalies.map((item) => item.code)
      }
    ];

    const trustBySource = {
      ...(state.trust_by_source || {}),
      [report.source]: report.reliabilityScore
    };

    await appClient.entities.UserProfile.update(profile.id, {
      anti_cheat_state: {
        ...state,
        last_score: report.reliabilityScore,
        last_tier: report.trustTier,
        trust_by_source: trustBySource,
        last_anomalies: report.anomalies.map((item) => item.code),
        history: nextHistory
      },
      __expected_updated_date: profile.updated_date
    });

    return {
      ...report,
      historySize: nextHistory.length
    };
  }
};

export default AntiCheatService;
