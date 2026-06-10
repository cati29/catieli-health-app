import { format } from 'date-fns';
import { appClient } from '@/api/appClient';

const toInteger = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getSeasonWindow = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    id: format(start, 'yyyy-MM'),
    start_date: format(start, 'yyyy-MM-dd'),
    end_date: format(end, 'yyyy-MM-dd'),
    label: `Temporada ${format(start, 'MM/yyyy')}`
  };
};

const getTimeframeDays = (timeframe) => {
  if (timeframe === 'week') return 7;
  if (timeframe === 'month') return 30;
  return null;
};

const getLeagueFromElo = (elo) => {
  if (elo >= 1750) return 'diamond';
  if (elo >= 1550) return 'platinum';
  if (elo >= 1380) return 'gold';
  if (elo >= 1220) return 'silver';
  return 'bronze';
};

const getEloFromMetrics = ({ seasonXP, level, skillTree }) => {
  const safeSeasonXP = toInteger(seasonXP, 0);
  const safeLevel = toInteger(level, 1);
  const skillScore = ['strength', 'sleep', 'nutrition', 'mind'].reduce(
    (sum, key) => sum + toInteger(skillTree?.[key], 0),
    0
  );

  const base = 950;
  const xpComponent = Math.round(Math.log10(safeSeasonXP + 10) * 180);
  const levelComponent = clamp(safeLevel * 6, 0, 240);
  const skillComponent = clamp(Math.round(skillScore * 0.35), 0, 220);

  return clamp(base + xpComponent + levelComponent + skillComponent, 850, 2100);
};

const getFallbackDisplayName = (profile) =>
  [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || profile.created_by || 'Usuário';

const sortByEloAndXP = (left, right) => {
  if (right.elo_rating !== left.elo_rating) return right.elo_rating - left.elo_rating;
  if (right.period_xp !== left.period_xp) return right.period_xp - left.period_xp;
  return (right.level || 1) - (left.level || 1);
};

export const LeaderboardSeasonService = {
  getSeasonWindow,
  getLeagueFromElo,

  async buildLeaderboard({ timeframe = 'all', userEmail = null } = {}) {
    const season = getSeasonWindow(new Date());
    const allProfiles = await appClient.entities.UserProfile.filter({ user_type: 'user' });
    const days = getTimeframeDays(timeframe);

    const ranked = await Promise.all(
      allProfiles.map(async (profile) => {
        const progression = profile.gamification_progression || {};
        const seasonXPById = progression.season_xp_by_id || {};
        const seasonXP = toInteger(seasonXPById[season.id], 0);
        const skillTree = progression.skill_tree || {};

        let periodXP = timeframe === 'all' ? toInteger(profile.xp, 0) : 0;
        if (days) {
          const goals = await appClient.entities.DailyGoal.filter(
            { created_by: profile.created_by },
            '-date',
            days
          );
          periodXP = goals.reduce((sum, goal) => {
            const waterGoal = toInteger(goal.water_goal_ml, 0);
            const waterDone = toInteger(goal.water_consumed_ml, 0);
            const exerciseGoal = toInteger(goal.exercise_minutes_goal, 0);
            const exerciseDone = toInteger(goal.exercise_minutes_done, 0);
            const caloriesGoal = toInteger(goal.calorie_goal, 0);
            const caloriesDone = toInteger(goal.calories_consumed, 0);

            let reward = 0;
            if (waterGoal > 0 && waterDone >= waterGoal) reward += 20;
            if (exerciseGoal > 0 && exerciseDone >= exerciseGoal) reward += 20;
            if (caloriesGoal > 0 && caloriesDone >= caloriesGoal) reward += 10;
            if (goal.completed) reward += 20;
            return sum + reward;
          }, 0);
        }

        const xpForElo = timeframe === 'all' ? seasonXP : periodXP;
        const elo = getEloFromMetrics({
          seasonXP: xpForElo,
          level: profile.level || 1,
          skillTree
        });
        const league = getLeagueFromElo(elo);

        return {
          ...profile,
          display_name: getFallbackDisplayName(profile),
          period_xp: periodXP,
          season_xp: seasonXP,
          elo_rating: elo,
          league
        };
      })
    );

    const sorted = [...ranked].sort(sortByEloAndXP).map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    const leagueRankMap = {};
    const withLeagueRanks = sorted.map((entry) => {
      const current = toInteger(leagueRankMap[entry.league], 0) + 1;
      leagueRankMap[entry.league] = current;
      return {
        ...entry,
        league_rank: current
      };
    });

    const currentUserEntry = withLeagueRanks.find((item) => item.created_by === userEmail) || null;

    return {
      season,
      leaderboard: withLeagueRanks,
      currentUserEntry,
      currentUserRank: currentUserEntry?.rank || 0
    };
  }
};

export default LeaderboardSeasonService;
