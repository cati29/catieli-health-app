import { appClient } from '@/api/appClient';
import { format } from 'date-fns';

/**
 * ExerciseService - Microsserviço de Exercícios
 * Centraliza lógica de treinos, sessões e progresso físico
 */
export const ExerciseService = {
  /**
   * Registra uma sessão de treino completa
   */
  async logWorkout(userId, routineId, routineName, durationMinutes, exercises = []) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const caloriesBurned = ExerciseService.estimateCalories(durationMinutes, exercises);

    const session = await appClient.entities.WorkoutSession.create({
      user_id: userId,
      routine_id: routineId,
      routine_name: routineName,
      date: today,
      duration_minutes: durationMinutes,
      calories_burned: caloriesBurned,
      exercises_completed: exercises,
      completed: true
    });

    // Atualiza meta diária
    const goals = await appClient.entities.DailyGoal.filter({ user_id: userId, date: today });
    if (goals[0]) {
      const prev = goals[0].exercise_minutes_done || 0;
      await appClient.entities.DailyGoal.update(goals[0].id, {
        exercise_minutes_done: prev + durationMinutes,
        __expected_updated_date: goals[0].updated_date
      });
    }

    const xp = ExerciseService.calculateXP(durationMinutes);
    return { session, caloriesBurned, xp };
  },

  /**
   * Registra exercício individual (log avulso)
   */
  async logExercise(userId, exerciseId, exerciseName, data) {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appClient.entities.ExerciseLog.create({
      user_id: userId,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      date: today,
      ...data
    });
  },

  estimateCalories(durationMinutes, exercises = []) {
    const hasStrength = exercises.some(e => e.sets && e.reps);
    const MET = hasStrength ? 5 : 7; // equivalente metabólico
    const weightKg = 70; // peso médio padrão
    return Math.round((MET * weightKg * durationMinutes) / 60);
  },

  calculateXP(durationMinutes) {
    if (durationMinutes >= 60) return 100;
    if (durationMinutes >= 45) return 75;
    if (durationMinutes >= 30) return 50;
    if (durationMinutes >= 15) return 25;
    return 10;
  },

  async getWeeklySessions(userId) {
    const sessions = await appClient.entities.WorkoutSession.filter({ user_id: userId });
    return sessions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
  },

  async getPersonalRecords(userId) {
    const logs = await appClient.entities.ExerciseLog.filter({ user_id: userId, personal_record: true });
    return logs;
  },

  async getStreak(userId) {
    const sessions = await appClient.entities.WorkoutSession.filter({ user_id: userId });
    if (!sessions.length) return 0;
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    let streak = 0;
    let current = new Date();
    for (const dateStr of dates) {
      const d = new Date(dateStr);
      const diff = Math.floor((current - d) / (1000 * 60 * 60 * 24));
      if (diff <= 1) { streak++; current = d; }
      else break;
    }
    return streak;
  }
};

export default ExerciseService;
