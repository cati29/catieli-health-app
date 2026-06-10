import { appClient } from '@/api/appClient';
import { format } from 'date-fns';

/**
 * WaterService - Microsserviço de Hidratação
 * Centraliza toda lógica de rastreamento de água
 */
export const WaterService = {
  /**
   * Adiciona consumo de água e retorna XP ganho
   */
  async addWater(userId, amountMl, todayGoalId = null) {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Registra entrada individual
    await appClient.entities.WaterEntry.create({
      user_id: userId,
      amount_ml: amountMl,
      date: today,
      time: format(new Date(), 'HH:mm')
    });

    // Atualiza meta diária
    const goals = await appClient.entities.DailyGoal.filter({ user_id: userId, date: today });
    const goal = goals[0];
    const newTotal = (goal?.water_consumed_ml || 0) + amountMl;

    if (goal) {
      await appClient.entities.DailyGoal.update(goal.id, {
        water_consumed_ml: newTotal,
        __expected_updated_date: goal.updated_date
      });
    } else {
      await appClient.entities.DailyGoal.create({
        user_id: userId,
        date: today,
        water_consumed_ml: newTotal,
        water_goal_ml: 3000,
        calorie_goal: 2000,
        exercise_minutes_goal: 30
      });
    }

    const xp = WaterService.calculateXP(amountMl);
    const progress = WaterService.getProgress(newTotal, 3000);
    const milestone = WaterService.checkMilestone(newTotal, goal?.water_consumed_ml || 0);

    return { newTotal, xp, progress, milestone };
  },

  calculateXP(amountMl) {
    if (amountMl >= 1000) return 100;
    if (amountMl >= 500)  return 10;
    if (amountMl >= 250)  return 5;
    return 1;
  },

  getProgress(consumed, goal = 3000) {
    return Math.min((consumed / goal) * 100, 100);
  },

  checkMilestone(newTotal, oldTotal) {
    const milestones = [500, 1000, 1500, 2000, 2500, 3000];
    return milestones.find(m => oldTotal < m && newTotal >= m) || null;
  },

  async getDailyHistory(userId, date = null) {
    const d = date || format(new Date(), 'yyyy-MM-dd');
    return appClient.entities.WaterEntry.filter({ user_id: userId, date: d });
  },

  async getWeeklyStats(userId) {
    const entries = await appClient.entities.WaterEntry.filter({ user_id: userId });
    const byDay = {};
    entries.forEach(e => {
      byDay[e.date] = (byDay[e.date] || 0) + e.amount_ml;
    });
    return byDay;
  }
};

export default WaterService;
