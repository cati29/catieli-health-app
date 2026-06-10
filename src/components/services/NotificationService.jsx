import { appClient } from '@/api/appClient';
import { createNotification } from '@/components/notifications/NotificationHelper';

/**
 * NotificationService - microsserviço de notificações
 * Centraliza envio, agendamento e histórico de notificações.
 */
export const NotificationService = {
  /**
   * Envia notificação imediata com template.
   */
  async send(userId, type, title, message, actionUrl = null, sendEmail = false) {
    return createNotification(userId, type, title, message, actionUrl, null, sendEmail);
  },

  async markAllRead(userId) {
    const notifs = await appClient.entities.Notification.filter({ user_id: userId, read: false });
    await Promise.all(notifs.map((notif) => appClient.entities.Notification.update(notif.id, { read: true })));
    return notifs.length;
  },

  async getUnread(userId) {
    return appClient.entities.Notification.filter({ user_id: userId, read: false });
  },

  async getAll(userId, limit = 20) {
    const all = await appClient.entities.Notification.filter({ user_id: userId });
    return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, limit);
  },

  // Templates prontos
  async notifyLevelUp(userId, newLevel) {
    return NotificationService.send(
      userId,
      'level_up',
      'Subiu de Nível!',
      `Incrível! Você alcançou o nível ${newLevel}!`,
      '/Profile',
      true
    );
  },

  async notifyBadge(userId, badgeName, badgeIcon = '') {
    const titlePrefix = badgeIcon ? `${badgeIcon} ` : '';
    return NotificationService.send(
      userId,
      'badge_unlocked',
      `${titlePrefix}Nova Conquista!`,
      `Parabéns! Você desbloqueou: "${badgeName}"`,
      '/Achievements'
    );
  },

  async notifyGoalCompleted(userId, goalName) {
    return NotificationService.send(
      userId,
      'goal_completed',
      'Meta Completada!',
      `Você completou: ${goalName}`,
      '/Goals'
    );
  },

  async notifyWaterReminder(userId) {
    return NotificationService.send(
      userId,
      'reminder',
      'Hora de Hidratar!',
      'Lembre-se de beber água. Mantenha-se hidratado!',
      '/Home'
    );
  },

  async notifyExerciseReminder(userId) {
    return NotificationService.send(
      userId,
      'reminder',
      'Hora do Treino!',
      'Que tal fazer sua sessão de exercícios hoje?',
      '/WorkoutTracker'
    );
  },

  async notifyMealReminder(userId, mealType) {
    const labels = {
      breakfast: 'Café da manhã',
      lunch: 'Almoço',
      dinner: 'Jantar',
      snack: 'Lanche'
    };

    return NotificationService.send(
      userId,
      'reminder',
      `${labels[mealType] || 'Refeição'}`,
      `Não esqueça de registrar sua ${labels[mealType] || 'refeição'}!`,
      '/NutritionTracker'
    );
  },

  async notifyChallengeExpiring(userId, challengeTitle, hoursLeft) {
    return NotificationService.send(
      userId,
      'challenge_expiring',
      'Desafio Expirando!',
      `"${challengeTitle}" expira em ${hoursLeft}h. Complete agora!`,
      '/Achievements'
    );
  },

  /**
   * Verifica e envia notificações baseadas no horário atual.
   * Ideal para usar em um scheduler periódico.
   */
  async runScheduledCheck(userId, profile) {
    const now = new Date();
    const hour = now.getHours();
    const prefs = profile?.notification_preferences;

    if (!prefs) return;

    // Lembrete de água (a cada 3h entre 8h e 20h).
    if (prefs.water_reminders && hour >= 8 && hour <= 20 && hour % 3 === 0) {
      await NotificationService.notifyWaterReminder(userId);
    }

    // Lembretes de refeição.
    if (prefs.goal_reminders) {
      if (hour === 8) await NotificationService.notifyMealReminder(userId, 'breakfast');
      if (hour === 12) await NotificationService.notifyMealReminder(userId, 'lunch');
      if (hour === 19) await NotificationService.notifyMealReminder(userId, 'dinner');
    }

    // Lembrete de treino (10h).
    if (hour === 10) {
      await NotificationService.notifyExerciseReminder(userId);
    }
  }
};

export default NotificationService;
