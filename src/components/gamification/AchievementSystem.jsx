import { appClient } from '@/api/appClient';
import { createNotification, NotificationTemplates } from '@/components/notifications/NotificationHelper';
import { levelFromXp } from '@/lib/leveling';

// Sistema de conquistas automático
export const AchievementSystem = {
  // Verificar e desbloquear badges baseado em progresso
  async checkAndUnlockBadges(userEmail, profile, stats = {}) {
    const allBadges = await appClient.entities.Badge.list();
    const userBadges = await appClient.entities.UserBadge.filter({ user_id: userEmail });
    const unlockedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));

    const newlyUnlocked = [];

    for (const badge of allBadges) {
      if (unlockedBadgeIds.has(badge.id)) continue;

      const shouldUnlock = this.checkBadgeRequirement(badge, profile, stats);
      if (!shouldUnlock) continue;

      await appClient.entities.UserBadge.create({
        user_id: userEmail,
        badge_id: badge.id,
        unlocked_date: new Date().toISOString()
      });

      const newXP = (profile.xp || 0) + badge.xp_reward;
      const newLevel = levelFromXp(newXP);

      await appClient.entities.UserProfile.update(profile.id, {
        xp: newXP,
        level: newLevel
      });

      const notification = NotificationTemplates.badgeUnlocked(badge.name);
      await createNotification(
        userEmail,
        notification.type,
        notification.title,
        notification.message,
        notification.actionUrl,
        { badge_name: badge.name, xp_reward: badge.xp_reward }
      );

      newlyUnlocked.push(badge);
    }

    return newlyUnlocked;
  },

  // Verificar requisito do badge
  checkBadgeRequirement(badge, profile, stats) {
    switch (badge.requirement_type) {
      case 'level_reached':
        return (profile.level || 1) >= badge.requirement_value;
      case 'xp_earned':
        return (profile.xp || 0) >= badge.requirement_value;
      case 'streak_days':
        return (stats.streak || 0) >= badge.requirement_value;
      case 'goals_completed':
        return (stats.goalsCompleted || 0) >= badge.requirement_value;
      case 'water_total':
        return (stats.totalWater || 0) >= badge.requirement_value;
      case 'daily_water_goal':
        return (stats.dailyWaterGoalsReached || 0) >= badge.requirement_value;
      case 'workouts_completed':
        return (stats.workoutsCompleted || 0) >= badge.requirement_value;
      case 'weight_lost':
        return (stats.weightLost || 0) >= badge.requirement_value;
      default:
        return false;
    }
  },

  // Calcular estatísticas do usuário
  async calculateUserStats(userEmail) {
    const dailyGoals = await appClient.entities.DailyGoal.filter({ created_by: userEmail }, '-date', 30);
    const workoutSessions = await appClient.entities.WorkoutSession.filter({ user_id: userEmail });
    const profiles = await appClient.entities.UserProfile.filter({ created_by: userEmail });
    const profile = profiles[0];

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i += 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayGoal = dailyGoals.find((g) => g.date === dateStr);
      if (dayGoal?.completed) {
        streak += 1;
      } else {
        break;
      }
    }

    const goalsCompleted = dailyGoals.filter((g) => g.completed).length;
    const totalWater = dailyGoals.reduce((sum, g) => sum + (g.water_consumed_ml || 0), 0);
    const dailyWaterGoalsReached = dailyGoals.filter(
      (g) => (g.water_consumed_ml || 0) >= (g.water_goal_ml || 2000)
    ).length;
    const workoutsCompleted = workoutSessions.filter((w) => w.completed).length;

    const weightHistory = profile?.weight_history || [];
    const weightLost = weightHistory.length > 0
      ? Math.max(0, weightHistory[0].weight - (profile?.weight || 0))
      : 0;

    return {
      streak,
      goalsCompleted,
      totalWater,
      dailyWaterGoalsReached,
      workoutsCompleted,
      weightLost
    };
  }
};

// Badges pré-definidos para criar no sistema
export const PredefinedBadges = [
  // Nível
  { name: 'Novato', description: 'Alcançou nível 5', icon: '🥉', category: 'level', requirement_type: 'level_reached', requirement_value: 5, xp_reward: 50, rarity: 'common' },
  { name: 'Progredindo', description: 'Alcançou nível 10', icon: '🥈', category: 'level', requirement_type: 'level_reached', requirement_value: 10, xp_reward: 100, rarity: 'rare' },
  { name: 'Veterano', description: 'Alcançou nível 20', icon: '🥇', category: 'level', requirement_type: 'level_reached', requirement_value: 20, xp_reward: 200, rarity: 'epic' },
  { name: 'Lendário', description: 'Alcançou nível 50', icon: '👑', category: 'level', requirement_type: 'level_reached', requirement_value: 50, xp_reward: 500, rarity: 'legendary' },

  // Sequência
  { name: 'Primeira Semana', description: '7 dias consecutivos', icon: '🔥', category: 'streak', requirement_type: 'streak_days', requirement_value: 7, xp_reward: 70, rarity: 'common' },
  { name: 'Duas Semanas', description: '14 dias consecutivos', icon: '🔥🔥', category: 'streak', requirement_type: 'streak_days', requirement_value: 14, xp_reward: 140, rarity: 'rare' },
  { name: 'Um Mês Forte', description: '30 dias consecutivos', icon: '⭐', category: 'streak', requirement_type: 'streak_days', requirement_value: 30, xp_reward: 300, rarity: 'epic' },
  { name: 'Disciplina Absoluta', description: '100 dias consecutivos', icon: '⚡', category: 'streak', requirement_type: 'streak_days', requirement_value: 100, xp_reward: 1000, rarity: 'legendary' },

  // Treino
  { name: 'Primeiro Treino', description: 'Complete seu primeiro treino', icon: '💪', category: 'exercise', requirement_type: 'workouts_completed', requirement_value: 1, xp_reward: 20, rarity: 'common' },
  { name: 'Guerreiro', description: 'Complete 7 treinos', icon: '🏋️', category: 'exercise', requirement_type: 'workouts_completed', requirement_value: 7, xp_reward: 100, rarity: 'rare' },
  { name: 'Atleta', description: 'Complete 30 treinos', icon: '🏃', category: 'exercise', requirement_type: 'workouts_completed', requirement_value: 30, xp_reward: 300, rarity: 'epic' },
  { name: 'Campeão', description: 'Complete 100 treinos', icon: '🏆', category: 'exercise', requirement_type: 'workouts_completed', requirement_value: 100, xp_reward: 1000, rarity: 'legendary' },

  // Hidratação — meta diária (dispara assim que a meta do dia é atingida)
  { name: 'Meta de Hidratação', description: 'Bata sua meta diária de água pela 1ª vez', icon: '💧', category: 'water', requirement_type: 'daily_water_goal', requirement_value: 1, xp_reward: 30, rarity: 'common' },
  { name: 'Hidratação na Rotina', description: 'Bata sua meta diária de água em 7 dias', icon: '🚿', category: 'water', requirement_type: 'daily_water_goal', requirement_value: 7, xp_reward: 100, rarity: 'rare' },
  { name: 'Hábito de Hidratação', description: 'Bata sua meta diária em 30 dias', icon: '🌊', category: 'water', requirement_type: 'daily_water_goal', requirement_value: 30, xp_reward: 300, rarity: 'epic' },

  // Hidratação — acumulado (volume total)
  { name: 'Bem Hidratado', description: 'Beba 10L de água no total', icon: '💦', category: 'water', requirement_type: 'water_total', requirement_value: 10000, xp_reward: 50, rarity: 'common' },
  { name: 'Mestre da Hidratação', description: 'Beba 50L de água no total', icon: '🌊', category: 'water', requirement_type: 'water_total', requirement_value: 50000, xp_reward: 150, rarity: 'rare' },
  { name: 'Oceano Pessoal', description: 'Beba 100L de água no total', icon: '🚰', category: 'water', requirement_type: 'water_total', requirement_value: 100000, xp_reward: 300, rarity: 'epic' },

  // Perda de peso
  { name: 'Primeiros Passos', description: 'Perca 2kg', icon: '🎯', category: 'weight_loss', requirement_type: 'weight_lost', requirement_value: 2, xp_reward: 100, rarity: 'common' },
  { name: 'Progresso Real', description: 'Perca 5kg', icon: '📉', category: 'weight_loss', requirement_type: 'weight_lost', requirement_value: 5, xp_reward: 200, rarity: 'rare' },
  { name: 'Transformação', description: 'Perca 10kg', icon: '🏅', category: 'weight_loss', requirement_type: 'weight_lost', requirement_value: 10, xp_reward: 500, rarity: 'epic' },
  { name: 'Nova Vida', description: 'Perca 20kg', icon: '🦋', category: 'weight_loss', requirement_type: 'weight_lost', requirement_value: 20, xp_reward: 1000, rarity: 'legendary' },

  // Metas
  { name: 'Primeiro Sucesso', description: 'Complete 10 metas diárias', icon: '✅', category: 'goals', requirement_type: 'goals_completed', requirement_value: 10, xp_reward: 50, rarity: 'common' },
  { name: 'Consistente', description: 'Complete 50 metas diárias', icon: '🎖️', category: 'goals', requirement_type: 'goals_completed', requirement_value: 50, xp_reward: 200, rarity: 'rare' },
  { name: 'Imparável', description: 'Complete 100 metas diárias', icon: '🚀', category: 'goals', requirement_type: 'goals_completed', requirement_value: 100, xp_reward: 500, rarity: 'epic' }
];
