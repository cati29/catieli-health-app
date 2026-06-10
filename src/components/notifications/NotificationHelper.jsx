import { appClient } from '@/api/appClient';

// Helper para criar notificações.
export const createNotification = async (
  userId,
  type,
  title,
  message,
  actionUrl = null,
  metadata = null,
  sendEmail = false
) => {
  try {
    await appClient.entities.Notification.create({
      user_id: userId,
      type,
      title,
      message,
      action_url: actionUrl,
      metadata
    });

    // Envio opcional de e-mail.
    if (sendEmail) {
      try {
        await appClient.integrations.Core.SendEmail({
          to: userId,
          subject: title,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">HEALTH APP</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">${message}</p>
                ${actionUrl ? `
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${actionUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                      Ver no App
                    </a>
                  </div>
                ` : ''}
              </div>
              <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p>Você recebeu este e-mail porque está cadastrado no Health App.</p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

// Templates de notificação.
export const NotificationTemplates = {
  badgeUnlocked: (badgeName) => ({
    type: 'badge_unlocked',
    title: 'Nova Conquista!',
    message: `Parabéns! Você desbloqueou o badge "${badgeName}"`,
    actionUrl: '/Achievements'
  }),

  challengeExpiring: (challengeTitle, hoursLeft) => ({
    type: 'challenge_expiring',
    title: 'Desafio Expirando!',
    message: `O desafio "${challengeTitle}" expira em ${hoursLeft} horas. Complete agora!`,
    actionUrl: '/Achievements'
  }),

  goalCompleted: (goalName) => ({
    type: 'goal_completed',
    title: 'Meta Completada!',
    message: `Parabéns! Você completou a meta: ${goalName}`,
    actionUrl: '/Goals'
  }),

  waterReminder: () => ({
    type: 'reminder',
    title: 'Lembre-se de se hidratar',
    message: 'Já tomou água hoje? Mantenha-se hidratado para atingir suas metas!',
    actionUrl: '/Home'
  }),

  weightReminder: () => ({
    type: 'reminder',
    title: 'Atualize seu peso',
    message: 'Faz tempo que você não registra seu peso. Atualize agora!',
    actionUrl: '/Profile'
  }),

  levelUp: (newLevel) => ({
    type: 'level_up',
    title: 'Subiu de Nível!',
    message: `Incrível! Você alcançou o nível ${newLevel}!`,
    actionUrl: '/Profile'
  }),

  dailyGoalReminder: () => ({
    type: 'reminder',
    title: 'Metas de Hoje',
    message: 'Não se esqueça de completar suas metas diárias!',
    actionUrl: '/Goals'
  }),

  mealPlanReady: (planTitle) => ({
    type: 'achievement',
    title: 'Plano de Refeições Pronto!',
    message: `Seu plano "${planTitle}" foi gerado com sucesso!`,
    actionUrl: '/MealPlans'
  })
};
