import { appClient } from '@/api/appClient';
import { format } from 'date-fns';

/**
 * NutritionService - Microsserviço de Nutrição
 * Centraliza cálculos nutricionais, refeições e metas calóricas
 */
export const NutritionService = {
  /**
   * Registra entrada de alimento e atualiza totais diários
   */
  async logFood(userId, foodData, quantityGrams, mealType) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const factor = quantityGrams / 100;

    const entry = {
      user_id: userId,
      date: today,
      food_name: foodData.name,
      food_id: foodData.id,
      quantity_grams: quantityGrams,
      meal_type: mealType,
      calories: Math.round((foodData.calories_per_100g || 0) * factor),
      protein_g: Math.round((foodData.protein_g || 0) * factor * 10) / 10,
      carbs_g: Math.round((foodData.carbs_g || 0) * factor * 10) / 10,
      fat_g: Math.round((foodData.fat_g || 0) * factor * 10) / 10,
      fiber_g: Math.round((foodData.fiber_g || 0) * factor * 10) / 10,
      sugar_g: Math.round((foodData.sugar_g || 0) * factor * 10) / 10,
      sodium_mg: Math.round((foodData.sodium_mg || 0) * factor),
    };

    const created = await appClient.entities.FoodEntry.create(entry);
    await NutritionService._updateDailyTotals(userId, today);

    const xp = NutritionService.calculateXP(entry.calories);
    return { entry: created, xp };
  },

  /**
   * Recalcula e salva os totais diários de nutrição
   */
  async _updateDailyTotals(userId, date) {
    const entries = await appClient.entities.FoodEntry.filter({ user_id: userId, date });
    const totals = entries.reduce((acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein_g: acc.protein_g + (e.protein_g || 0),
      carbs_g: acc.carbs_g + (e.carbs_g || 0),
      fat_g: acc.fat_g + (e.fat_g || 0),
      fiber_g: acc.fiber_g + (e.fiber_g || 0),
      sugar_g: acc.sugar_g + (e.sugar_g || 0),
      sodium_mg: acc.sodium_mg + (e.sodium_mg || 0),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });

    const existing = await appClient.entities.DailyNutrition.filter({ user_id: userId, date });
    if (existing[0]) {
      await appClient.entities.DailyNutrition.update(existing[0].id, {
        ...totals,
        __expected_updated_date: existing[0].updated_date
      });
    } else {
      await appClient.entities.DailyNutrition.create({ user_id: userId, date, ...totals });
    }
    return totals;
  },

  calculateXP(calories) {
    if (calories >= 500) return 20;
    if (calories >= 200) return 10;
    return 5;
  },

  /**
   * Calcula necessidade calórica diária (TMB + fator atividade)
   */
  calculateDailyCalorieNeeds(profile) {
    if (!profile?.weight || !profile?.height || !profile?.age) return 2000;
    let tmb;
    if (profile.gender === 'male') {
      tmb = 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * profile.age);
    } else {
      tmb = 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * profile.age);
    }
    const activityFactor = 1.55; // moderadamente ativo
    return Math.round(tmb * activityFactor);
  },

  /**
   * Calcula macros ideais baseados na meta do usuário
   */
  calculateMacroTargets(calorieGoal, goal = 'health') {
    const targets = {
      weight_loss:  { protein: 0.35, carbs: 0.35, fat: 0.30 },
      muscle_gain:  { protein: 0.40, carbs: 0.40, fat: 0.20 },
      health:       { protein: 0.25, carbs: 0.50, fat: 0.25 },
      weight_gain:  { protein: 0.30, carbs: 0.50, fat: 0.20 },
    };
    const ratio = targets[goal] || targets.health;
    return {
      protein_g: Math.round((calorieGoal * ratio.protein) / 4),
      carbs_g:   Math.round((calorieGoal * ratio.carbs) / 4),
      fat_g:     Math.round((calorieGoal * ratio.fat) / 9),
    };
  },

  async getDailyNutrition(userId, date = null) {
    const d = date || format(new Date(), 'yyyy-MM-dd');
    const entries = await appClient.entities.DailyNutrition.filter({ user_id: userId, date: d });
    return entries[0] || null;
  },

  async getWeeklyNutrition(userId) {
    const records = await appClient.entities.DailyNutrition.filter({ user_id: userId });
    return records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
  },

  async getTodayEntries(userId) {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appClient.entities.FoodEntry.filter({ user_id: userId, date: today });
  }
};

export default NutritionService;
