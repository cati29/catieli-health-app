import { format } from 'date-fns';
import { appClient } from '@/api/appClient';
import { progressInLevel } from '@/lib/leveling';

const MAX_LOG_ENTRIES = 150;

const DEFAULT_DAILY_CAPS = {
  water: 180,
  workout: 360,
  nutrition: 220,
  sleep: 160,
  mission: 260,
  challenge: 420,
  manual_goal: 300,
  default: 200
};

const ACTION_CONFIG = {
  water: { skill: 'nutrition', cooldownSec: 25, cap: DEFAULT_DAILY_CAPS.water },
  workout: { skill: 'strength', cooldownSec: 180, cap: DEFAULT_DAILY_CAPS.workout },
  nutrition: { skill: 'nutrition', cooldownSec: 90, cap: DEFAULT_DAILY_CAPS.nutrition },
  sleep: { skill: 'sleep', cooldownSec: 21600, cap: DEFAULT_DAILY_CAPS.sleep },
  mission: { skill: 'mind', cooldownSec: 20, cap: DEFAULT_DAILY_CAPS.mission },
  challenge: { skill: 'mind', cooldownSec: 20, cap: DEFAULT_DAILY_CAPS.challenge },
  manual_goal: { skill: 'mind', cooldownSec: 35, cap: DEFAULT_DAILY_CAPS.manual_goal }
};

const SKILL_KEYS = ['strength', 'sleep', 'nutrition', 'mind'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toInteger = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
};

const getToday = () => format(new Date(), 'yyyy-MM-dd');

const getSeasonId = (date = new Date()) => format(date, 'yyyy-MM');

const getLevelFromXP = (xp) => {
  const info = progressInLevel(xp);
  return {
    level: info.level,
    xpInLevel: info.xpInLevel,
    xpToNextLevel: info.xpToNext
  };
};

const buildEventKey = (actionType, context = {}) => {
  const normalizedContext = JSON.stringify(context || {});
  return `${actionType}:${normalizedContext}`;
};

const createDefaultState = () => ({
  version: 1,
  last_reset_date: getToday(),
  daily_xp_total: 0,
  daily_xp_by_action: {},
  cooldowns: {},
  rejected_attempts: 0,
  season_xp_by_id: {},
  skill_tree: {
    strength: 0,
    sleep: 0,
    nutrition: 0,
    mind: 0
  },
  history: []
});

const normalizeState = (state = {}) => {
  const next = {
    ...createDefaultState(),
    ...(state || {})
  };

  next.daily_xp_by_action = { ...(next.daily_xp_by_action || {}) };
  next.cooldowns = { ...(next.cooldowns || {}) };
  next.season_xp_by_id = { ...(next.season_xp_by_id || {}) };

  const skillTree = { ...(next.skill_tree || {}) };
  next.skill_tree = {
    strength: toInteger(skillTree.strength, 0),
    sleep: toInteger(skillTree.sleep, 0),
    nutrition: toInteger(skillTree.nutrition, 0),
    mind: toInteger(skillTree.mind, 0)
  };

  next.history = Array.isArray(next.history) ? next.history : [];

  return next;
};

const resetDailyEconomyIfNeeded = (state) => {
  const today = getToday();
  if (state.last_reset_date === today) return state;
  return {
    ...state,
    last_reset_date: today,
    daily_xp_total: 0,
    daily_xp_by_action: {},
    cooldowns: {}
  };
};

const getActionConfig = (actionType) => ACTION_CONFIG[actionType] || {
  skill: 'mind',
  cooldownSec: 45,
  cap: DEFAULT_DAILY_CAPS.default
};

const resolveEconomyMultiplier = ({ level, reliabilityMultiplier = 1, dailyXpTotal = 0 }) => {
  const levelSoftCap = level > 30 ? 0.85 : level > 20 ? 0.92 : 1;
  const economySoftCap = dailyXpTotal > 260 ? 0.75 : dailyXpTotal > 170 ? 0.86 : 1;
  return clamp(levelSoftCap * economySoftCap * reliabilityMultiplier, 0.2, 1.15);
};

const allocateSkillPoints = (skillTree, skillKey, xpGranted) => {
  const gain = Math.max(1, Math.floor(xpGranted / 45));
  return {
    ...skillTree,
    [skillKey]: clamp(toInteger(skillTree[skillKey], 0) + gain, 0, 9999)
  };
};

export const ProgressionService = {
  getLevelFromXP,

  async getProfile(userId) {
    const profiles = await appClient.entities.UserProfile.filter(
      { created_by: userId },
      '-created_date',
      1
    );
    return profiles?.[0] || null;
  },

  async grantXP({
    userId,
    profile = null,
    actionType = 'manual_goal',
    baseXP = 0,
    reliabilityScore = null,
    context = {},
    reason = ''
  }) {
    if (!userId) {
      return { granted: false, xpGranted: 0, reason: 'missing_user' };
    }

    const currentProfile = profile || (await this.getProfile(userId));
    if (!currentProfile) {
      return { granted: false, xpGranted: 0, reason: 'missing_profile' };
    }

    const action = getActionConfig(actionType);
    let state = normalizeState(currentProfile.gamification_progression || {});
    state = resetDailyEconomyIfNeeded(state);

    const eventKey = buildEventKey(actionType, context);
    const now = Date.now();
    const cooldownMs = action.cooldownSec * 1000;
    const previousEventAt = Number(state.cooldowns[eventKey] || 0);

    if (previousEventAt && now - previousEventAt < cooldownMs) {
      const nextState = {
        ...state,
        rejected_attempts: toInteger(state.rejected_attempts, 0) + 1
      };
      await appClient.entities.UserProfile.update(currentProfile.id, {
        gamification_progression: nextState,
        __expected_updated_date: currentProfile.updated_date
      });
      return { granted: false, xpGranted: 0, reason: 'cooldown', profile: currentProfile };
    }

    const safeBaseXP = clamp(toInteger(baseXP, 0), 0, 500);
    if (safeBaseXP <= 0) {
      return { granted: false, xpGranted: 0, reason: 'non_positive' };
    }

    const levelBefore = toInteger(currentProfile.level, 1);
    const sourceMultiplier = reliabilityScore == null
      ? 1
      : clamp(Number(reliabilityScore) / 100, 0.2, 1.05);
    const economyMultiplier = resolveEconomyMultiplier({
      level: levelBefore,
      reliabilityMultiplier: sourceMultiplier,
      dailyXpTotal: toInteger(state.daily_xp_total, 0)
    });

    const adjustedXP = Math.max(1, Math.round(safeBaseXP * economyMultiplier));
    const consumedByAction = toInteger(state.daily_xp_by_action[actionType], 0);
    const remainingCap = Math.max(0, action.cap - consumedByAction);
    const xpGranted = Math.min(adjustedXP, remainingCap);

    if (xpGranted <= 0) {
      const nextState = {
        ...state,
        rejected_attempts: toInteger(state.rejected_attempts, 0) + 1
      };
      await appClient.entities.UserProfile.update(currentProfile.id, {
        gamification_progression: nextState,
        __expected_updated_date: currentProfile.updated_date
      });
      return { granted: false, xpGranted: 0, reason: 'daily_cap', profile: currentProfile };
    }

    const totalXP = toInteger(currentProfile.xp, 0) + xpGranted;
    const levelInfo = getLevelFromXP(totalXP);
    const seasonId = getSeasonId();
    const historyEntry = {
      at: new Date().toISOString(),
      action: actionType,
      base_xp: safeBaseXP,
      granted_xp: xpGranted,
      multiplier: Number(economyMultiplier.toFixed(3)),
      reason,
      context
    };

    const nextState = {
      ...state,
      daily_xp_total: toInteger(state.daily_xp_total, 0) + xpGranted,
      daily_xp_by_action: {
        ...state.daily_xp_by_action,
        [actionType]: consumedByAction + xpGranted
      },
      cooldowns: {
        ...state.cooldowns,
        [eventKey]: now
      },
      season_xp_by_id: {
        ...state.season_xp_by_id,
        [seasonId]: toInteger(state.season_xp_by_id[seasonId], 0) + xpGranted
      },
      skill_tree: allocateSkillPoints(state.skill_tree, action.skill, xpGranted),
      history: [...state.history.slice(-(MAX_LOG_ENTRIES - 1)), historyEntry]
    };

    await appClient.entities.UserProfile.update(currentProfile.id, {
      xp: totalXP,
      level: levelInfo.level,
      gamification_progression: nextState,
      __expected_updated_date: currentProfile.updated_date
    });

    return {
      granted: true,
      xpGranted,
      baseXP: safeBaseXP,
      totalXP,
      level: levelInfo.level,
      leveledUp: levelInfo.level > levelBefore,
      progressionState: nextState,
      profile: {
        ...currentProfile,
        xp: totalXP,
        level: levelInfo.level,
        gamification_progression: nextState
      }
    };
  },

  async getSkillTree(userId) {
    const profile = await this.getProfile(userId);
    if (!profile) return null;
    const state = normalizeState(profile.gamification_progression || {});
    return state.skill_tree;
  }
};

export default ProgressionService;
