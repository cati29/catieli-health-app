import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { appClient } from '@/api/appClient';
import { ProgressionService } from '@/components/services/ProgressionService';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toInteger = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const buildPeriodKey = (type, date = new Date()) => {
  if (type === 'weekly') {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return `week-${format(weekStart, 'yyyy-MM-dd')}`;
  }
  return format(date, 'yyyy-MM-dd');
};

const buildDateRange = (type, date = new Date()) => {
  const start = type === 'weekly'
    ? startOfWeek(date, { weekStartsOn: 1 })
    : date;
  const end = type === 'weekly'
    ? endOfWeek(date, { weekStartsOn: 1 })
    : addDays(date, 1);

  return {
    start_date: format(start, 'yyyy-MM-dd'),
    end_date: format(end, 'yyyy-MM-dd')
  };
};

const resolveDifficultyFactor = (profile = {}) => {
  const level = toInteger(profile.level, 1);
  return clamp(1 + level * 0.035, 1, 2.1);
};

const resolveGoalBias = (goal = '') => {
  if (goal === 'weight_loss') return { water: 1.15, exercise: 1.2, sleep: 1.05 };
  if (goal === 'muscle_gain') return { water: 1.05, exercise: 1.25, sleep: 1.1 };
  if (goal === 'weight_gain') return { water: 1.05, exercise: 1.1, sleep: 1.05 };
  return { water: 1, exercise: 1, sleep: 1 };
};

const proceduralTargets = ({ profile, type, metric, baseline = 0 }) => {
  const difficulty = resolveDifficultyFactor(profile);
  const bias = resolveGoalBias(profile?.goal);
  const periodMultiplier = type === 'weekly' ? 6 : 1;

  if (metric === 'water_consumed_ml') {
    const base = clamp(Math.round(Math.max(1800, baseline || 2200) * bias.water), 1500, 4200);
    const target = clamp(Math.round(base * difficulty * periodMultiplier), 1600, 26000);
    return target;
  }
  if (metric === 'exercise_minutes_done') {
    const base = clamp(Math.round(Math.max(20, baseline || 30) * bias.exercise), 15, 90);
    const target = clamp(Math.round(base * difficulty * periodMultiplier), 20, 640);
    return target;
  }
  if (metric === 'sleep_hours') {
    const base = clamp(Math.max(6, baseline || 7) * bias.sleep, 6, 9.5);
    const target = Number(clamp(base * (type === 'weekly' ? 6.4 : 1), 6, 65).toFixed(1));
    return target;
  }
  return 0;
};

const buildQuestTemplates = ({ profile, type, baseline }) => {
  const waterTarget = proceduralTargets({
    profile,
    type,
    metric: 'water_consumed_ml',
    baseline: baseline.water
  });
  const exerciseTarget = proceduralTargets({
    profile,
    type,
    metric: 'exercise_minutes_done',
    baseline: baseline.exercise
  });
  const sleepTarget = proceduralTargets({
    profile,
    type,
    metric: 'sleep_hours',
    baseline: baseline.sleep
  });

  const periodLabel = type === 'weekly' ? 'semana' : 'dia';
  const baseXp = type === 'weekly' ? 120 : 45;

  return [
    {
      category: 'water',
      metric_key: 'water_consumed_ml',
      title: type === 'weekly' ? 'Hidratação consistente da semana' : 'Hidratação diária',
      description: `Consuma ${waterTarget} ml de água neste ${periodLabel}.`,
      goal_value: waterTarget,
      xp_reward: Math.round(baseXp + waterTarget / (type === 'weekly' ? 420 : 85))
    },
    {
      category: 'exercise',
      metric_key: 'exercise_minutes_done',
      title: type === 'weekly' ? 'Treino da temporada semanal' : 'Treino essencial do dia',
      description: `Acumule ${exerciseTarget} minutos de exercício neste ${periodLabel}.`,
      goal_value: exerciseTarget,
      xp_reward: Math.round(baseXp + exerciseTarget / (type === 'weekly' ? 8 : 2))
    },
    {
      category: 'sleep',
      metric_key: 'sleep_hours',
      title: type === 'weekly' ? 'Sono de recuperação semanal' : 'Sono restaurador',
      description: `Registre ${sleepTarget} horas de sono neste ${periodLabel}.`,
      goal_value: sleepTarget,
      xp_reward: Math.round(baseXp + Number(sleepTarget) * 8)
    }
  ];
};

const missionProgressByMetric = ({ metricKey, dailyGoal, healthData }) => {
  if (metricKey === 'water_consumed_ml') return toInteger(dailyGoal?.water_consumed_ml, 0);
  if (metricKey === 'exercise_minutes_done') return toInteger(dailyGoal?.exercise_minutes_done, 0);
  if (metricKey === 'sleep_hours') return Number(healthData?.sleep_hours || 0);
  return 0;
};

const attachChallengeMap = (userChallenges, challengeMap) =>
  userChallenges.map((userChallenge) => {
    const challenge = challengeMap.get(userChallenge.challenge_id) || {};
    return {
      ...userChallenge,
      ...challenge,
      id: userChallenge.id,
      user_challenge_id: userChallenge.id,
      goal_value: userChallenge.goal_value ?? challenge.goal_value ?? challenge.target_value ?? 0,
      metric_key: userChallenge.metric_key || challenge.metric_key,
      title: challenge.title || userChallenge.title || challenge.name || 'Missao'
    };
  });

export const QuestService = {
  async ensurePersonalizedMissions(userId, profile, type = 'daily') {
    if (!userId || !profile?.id) return [];

    const periodKey = buildPeriodKey(type);
    const existing = await appClient.entities.UserChallenge.filter({
      user_id: userId,
      period_key: periodKey,
      mission_type: type
    });

    if (existing.length > 0) {
      return existing;
    }

    const todayGoalRows = await appClient.entities.DailyGoal.filter({ created_by: userId, date: todayStr() });
    const healthRows = await appClient.entities.HealthData.filter({ user_id: userId, date: todayStr() });

    const baseline = {
      water: toInteger(todayGoalRows?.[0]?.water_goal_ml, 2200),
      exercise: toInteger(todayGoalRows?.[0]?.exercise_minutes_goal, 30),
      sleep: Number(healthRows?.[0]?.sleep_hours || 7)
    };

    const templates = buildQuestTemplates({ profile, type, baseline });
    const { start_date, end_date } = buildDateRange(type);

    const createdUserChallenges = [];

    for (const template of templates) {
      const challenge = await appClient.entities.Challenge.create({
        user_id: userId,
        created_by: userId,
        name: template.title,
        title: template.title,
        description: template.description,
        category: template.category,
        type,
        mission_type: type,
        target_value: template.goal_value,
        goal_value: template.goal_value,
        metric_key: template.metric_key,
        xp_reward: template.xp_reward,
        period_key: periodKey,
        start_date,
        end_date,
        is_active: true,
        procedural: true
      });

      const userChallenge = await appClient.entities.UserChallenge.create({
        user_id: userId,
        created_by: userId,
        challenge_id: challenge.id,
        title: template.title,
        mission_type: type,
        period_key: periodKey,
        category: template.category,
        metric_key: template.metric_key,
        progress: 0,
        goal_value: template.goal_value,
        xp_reward: template.xp_reward,
        completed: false,
        claimed: false,
        start_date,
        end_date
      });

      createdUserChallenges.push(userChallenge);
    }

    return createdUserChallenges;
  },

  async listActiveMissions(userId) {
    if (!userId) return [];

    const allUserChallenges = await appClient.entities.UserChallenge.filter({ user_id: userId });
    const today = todayStr();
    const active = allUserChallenges.filter((item) => {
      if (item.completed && item.claimed) return false;
      if (item.end_date && item.end_date < today) return false;
      return true;
    });

    if (active.length === 0) return [];

    const challengeIds = [...new Set(active.map((item) => item.challenge_id).filter(Boolean))];
    const challengeList = await Promise.all(
      challengeIds.map((id) => appClient.entities.Challenge.filter({ id }))
    );

    const challengeMap = new Map();
    challengeList.forEach((rows) => {
      if (rows?.[0]?.id) challengeMap.set(rows[0].id, rows[0]);
    });

    return attachChallengeMap(active, challengeMap).sort((left, right) => {
      if (left.completed !== right.completed) return left.completed ? 1 : -1;
      if (left.mission_type !== right.mission_type) return left.mission_type === 'daily' ? -1 : 1;
      return String(left.title || '').localeCompare(String(right.title || ''));
    });
  },

  async syncProgressFromSnapshot(userId, { dailyGoal = null, healthData = null } = {}) {
    if (!userId) return { updated: 0, completed: 0 };

    const activeMissions = await this.listActiveMissions(userId);
    let updated = 0;
    let completedNow = 0;

    for (const mission of activeMissions) {
      if (mission.claimed) continue;

      const progressRaw = missionProgressByMetric({
        metricKey: mission.metric_key,
        dailyGoal,
        healthData
      });
      const goal = Number(mission.goal_value || 0);
      const safeProgress = Number(progressRaw || 0);
      const completed = goal > 0 && safeProgress >= goal;

      const progressChanged = Number(mission.progress || 0) !== safeProgress;
      const completionChanged = Boolean(mission.completed) !== completed;
      if (!progressChanged && !completionChanged) continue;

      await appClient.entities.UserChallenge.update(mission.user_challenge_id || mission.id, {
        progress: safeProgress,
        completed,
        completed_date: completed ? new Date().toISOString() : null
      });

      updated += 1;
      if (completed && !mission.completed) completedNow += 1;
    }

    return {
      updated,
      completed: completedNow
    };
  },

  async claimMissionReward(userId, userChallengeId, { reliabilityScore = 100 } = {}) {
    if (!userId || !userChallengeId) {
      return { claimed: false, reason: 'invalid_input' };
    }

    const rows = await appClient.entities.UserChallenge.filter({ id: userChallengeId, user_id: userId });
    const userChallenge = rows?.[0];
    if (!userChallenge) {
      return { claimed: false, reason: 'not_found' };
    }
    if (!userChallenge.completed) {
      return { claimed: false, reason: 'not_completed' };
    }
    if (userChallenge.claimed) {
      return { claimed: false, reason: 'already_claimed' };
    }

    const profileRows = await appClient.entities.UserProfile.filter({ created_by: userId }, '-created_date', 1);
    const profile = profileRows?.[0];
    if (!profile) {
      return { claimed: false, reason: 'missing_profile' };
    }

    const reward = await ProgressionService.grantXP({
      userId,
      profile,
      actionType: 'mission',
      baseXP: toInteger(userChallenge.xp_reward, 0),
      reliabilityScore,
      context: { user_challenge_id: userChallengeId, challenge_id: userChallenge.challenge_id },
      reason: 'mission_claim'
    });

    if (!reward.granted) {
      return { claimed: false, reason: reward.reason, reward };
    }

    await appClient.entities.UserChallenge.update(userChallenge.id, {
      claimed: true,
      claimed_date: new Date().toISOString(),
      reward_xp_granted: reward.xpGranted
    });

    return {
      claimed: true,
      reward
    };
  }
};

export default QuestService;
