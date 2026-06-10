import { useEffect, useState } from 'react';
import { appClient } from '@/api/appClient';
import { createNotification } from './NotificationHelper';

export default function NotificationScheduler({ profile }) {
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    if (!profile) return;

    const prefs = profile.notification_preferences || {};
    
    // Check every minute for scheduled notifications
    const interval = setInterval(async () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      // Only send once per minute
      if (Date.now() - lastCheck < 50000) return;
      setLastCheck(Date.now());

      const user = await appClient.auth.me();

      // Water reminders
      if (prefs.water_reminders && prefs.water_reminder_times?.includes(currentTime)) {
        await createNotification(
          user.email,
          'reminder',
          '💧 Hora de Hidratar!',
          'Não esqueça de beber água. Mantenha-se saudável!',
          '/Home',
          null,
          prefs.email_notifications
        );
      }

      // Goal reminder
      if (prefs.goal_reminders && prefs.goal_reminder_time === currentTime) {
        const today = now.toISOString().split('T')[0];
        const dailyGoals = await appClient.entities.DailyGoal.filter({
          created_by: user.email,
          date: today
        });

        const todayGoal = dailyGoals[0];
        if (todayGoal && !todayGoal.completed) {
          await createNotification(
            user.email,
            'reminder',
            '🎯 Lembrete de Metas',
            'Você ainda não completou suas metas de hoje. Que tal dar uma olhada?',
            '/Goals',
            null,
            prefs.email_notifications
          );
        }
      }

      // Challenge expiring reminders (check once per day at 10:00)
      if (prefs.challenge_alerts && currentTime === '10:00') {
        const userChallenges = await appClient.entities.UserChallenge.filter({
          user_id: user.email,
          completed: false
        });

        for (const uc of userChallenges) {
          const challenges = await appClient.entities.Challenge.filter({ id: uc.challenge_id });
          const challenge = challenges[0];
          
          if (challenge && challenge.end_date) {
            const daysLeft = Math.ceil((new Date(challenge.end_date) - now) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 2 && daysLeft > 0) {
              await createNotification(
                user.email,
                'challenge_expiring',
                '⏰ Desafio Expirando!',
                `O desafio "${challenge.title}" termina em ${daysLeft} dia(s)!`,
                '/Goals',
                { challenge_id: challenge.id },
                prefs.email_notifications
              );
            }
          }
        }
      }

      // Check for new app updates (once per day at 09:00)
      if (prefs.app_updates && currentTime === '09:00') {
        const updates = await appClient.entities.AppUpdate.filter({ is_active: true });
        const latestUpdate = updates.sort((a, b) => 
          new Date(b.publish_date) - new Date(a.publish_date)
        )[0];

        if (latestUpdate) {
          const publishDate = new Date(latestUpdate.publish_date);
          const daysSincePublish = Math.ceil((now - publishDate) / (1000 * 60 * 60 * 24));
          
          // Only notify if update is recent (less than 3 days old)
          if (daysSincePublish <= 3) {
            await createNotification(
              user.email,
              'achievement',
              `S ${latestUpdate.title}`,
              latestUpdate.description,
              '/Home',
              null,
              prefs.email_notifications
            );
          }
        }
      }

    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [profile, lastCheck]);

  return null; // This is a background component
}
