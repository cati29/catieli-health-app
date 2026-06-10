import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Activity,
  Apple,
  Check,
  Droplet,
  Dumbbell,
  Flame,
  Palette,
  Star,
  Target,
  Trophy,
  X,
  Zap
} from 'lucide-react';
import { appClient } from '@/api/appClient';
import AvatarCustomization from '@/components/avatar/AvatarCustomization';
import { AchievementSystem } from '@/components/gamification/AchievementSystem';
import HealthDataWidget from '@/components/health/HealthDataWidget';
import {
  createNotification,
  NotificationTemplates
} from '@/components/notifications/NotificationHelper';
import WearableConnection from '@/components/wearables/WearableConnection';
import { toast } from '@/components/ui/use-toast';
import { ensurePersonalizedExercisesForProfile } from '@/components/services/PersonalizedExerciseService';
import { ProgressionService, QuestService } from '@/components/services';

export default function Home() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [xpAnimation, setXpAnimation] = useState(null);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);
  const [showAvatarCustomization, setShowAvatarCustomization] = useState(false);
  const [badgeUnlockedAnimation, setBadgeUnlockedAnimation] = useState(null);
  const [exerciseBootstrapAttempted, setExerciseBootstrapAttempted] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: user.email });
    }
  });

  const profile = profiles?.[0];

  const { data: dailyGoals } = useQuery({
    queryKey: ['dailyGoal', today],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.DailyGoal.filter({
        created_by: user.email,
        date: today
      });
    }
  });

  const todayGoal = dailyGoals?.[0];

  const { data: healthData } = useQuery({
    queryKey: ['healthData', today],
    queryFn: async () => {
      const user = await appClient.auth.me();
      const data = await appClient.entities.HealthData.filter({
        user_id: user.email,
        date: today
      });
      return data[0] || null;
    },
    enabled: !!profile?.wearable_data?.connected
  });

  const { data: activeMissions } = useQuery({
    queryKey: ['activeMissions', today, profile?.id],
    queryFn: async () => {
      const user = await appClient.auth.me();
      await QuestService.ensurePersonalizedMissions(user.email, profile, 'daily');
      await QuestService.ensurePersonalizedMissions(user.email, profile, 'weekly');
      return QuestService.listActiveMissions(user.email);
    },
    enabled: !!profile?.id,
    initialData: []
  });

  const calculateStreak = () => 7;

  const updateXPMutation = useMutation({
    onMutate: async (xpPayload) => {
      await queryClient.cancelQueries({ queryKey: ['userProfile'] });
      const previousProfiles = queryClient.getQueryData(['userProfile']);
      const requestedXP = Number(xpPayload?.xp || 0);

      if (previousProfiles?.[0]) {
        const current = previousProfiles[0];
        const optimisticXP = (current.xp || 0) + requestedXP;
        const optimisticLevel = Math.floor(optimisticXP / 100) + 1;

        queryClient.setQueryData(['userProfile'], [
          {
            ...current,
            xp: optimisticXP,
            level: optimisticLevel
          },
          ...previousProfiles.slice(1)
        ]);
      }

      return { previousProfiles };
    },
    mutationFn: async (xpPayload) => {
      const safePayload = xpPayload || {};
      const requestedXP = Number(safePayload?.xp || 0);
      const actionType = safePayload?.actionType || 'manual_goal';
      const contextPayload = safePayload?.context || {};

      const user = await appClient.auth.me();
      const latestProfiles = await appClient.entities.UserProfile.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      const latestProfile = latestProfiles?.[0];
      if (!latestProfile) return null;

      const reward = await ProgressionService.grantXP({
        userId: user.email,
        profile: latestProfile,
        actionType,
        baseXP: requestedXP,
        reliabilityScore: healthData?.trust_score ?? 100,
        context: contextPayload,
        reason: 'home_flow'
      });

      if (!reward?.granted) {
        return {
          leveledUp: false,
          newLevel: latestProfile.level || 1,
          newXP: latestProfile.xp || 0,
          blockedReason: reward?.reason || 'unknown',
          xpGranted: 0
        };
      }

      const newXP = reward.totalXP;
      const newLevel = reward.level;
      const leveledUp = reward.leveledUp;

      if (leveledUp) {
        const notification = NotificationTemplates.levelUp(newLevel);
        await createNotification(
          user.email,
          notification.type,
          notification.title,
          notification.message,
          notification.actionUrl,
          null,
          true
        );
      }

      const stats = await AchievementSystem.calculateUserStats(user.email);
      const newBadges = await AchievementSystem.checkAndUnlockBadges(
        user.email,
        {
          ...latestProfile,
          xp: newXP,
          level: newLevel,
          gamification_progression: reward.progressionState
        },
        stats
      );

      if (newBadges.length > 0) {
        setBadgeUnlockedAnimation(newBadges[0]);
        setTimeout(() => setBadgeUnlockedAnimation(null), 4000);
      }

      return {
        leveledUp,
        newLevel,
        newXP,
        xpGranted: reward.xpGranted,
        blockedReason: null
      };
    },
    onError: (_error, _xpToAdd, context) => {
      if (context?.previousProfiles) {
        queryClient.setQueryData(['userProfile'], context.previousProfiles);
      }
    },
    onSuccess: (data) => {
      if (data?.blockedReason) {
        if (data.blockedReason === 'daily_cap') {
          toast({
            title: 'Cap diário de XP atingido',
            description: 'Continue suas atividades. O XP volta a pontuar totalmente no próximo dia.'
          });
        }
        if (data.blockedReason === 'cooldown') {
          toast({
            title: 'Ação repetida muito rápido',
            description: 'Aguarde alguns segundos antes de repetir para evitar exploit.'
          });
        }
      }

      if (data?.newXP !== undefined || data?.newLevel !== undefined) {
        queryClient.setQueryData(['userProfile'], (current = []) => {
          if (!current?.[0]) return current;
          return [
            {
              ...current[0],
              xp: data?.newXP ?? current[0].xp,
              level: data?.newLevel ?? current[0].level
            },
            ...current.slice(1)
          ];
        });
      }

      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['activeMissions'] });

      if (data?.xpGranted > 0) {
        setXpAnimation({
          amount: data.xpGranted,
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 15
        });
        setTimeout(() => setXpAnimation(null), 1800);
      }

      if (data?.leveledUp) {
        setLevelUpAnimation(true);
        setTimeout(() => setLevelUpAnimation(false), 3000);
      }
    }
  });

  const claimMissionMutation = useMutation({
    mutationFn: async (userChallengeId) => {
      const user = await appClient.auth.me();
      return QuestService.claimMissionReward(user.email, userChallengeId, {
        reliabilityScore: healthData?.trust_score ?? 100
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['activeMissions'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });

      if (result?.claimed && result?.reward?.xpGranted > 0) {
        setXpAnimation({
          amount: result.reward.xpGranted,
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 15
        });
        setTimeout(() => setXpAnimation(null), 1800);
        toast({
          title: 'Missao resgatada',
          description: `+${result.reward.xpGranted} XP aplicado com sucesso.`
        });
      }
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (data) => {
      if (todayGoal) {
        return appClient.entities.DailyGoal.update(todayGoal.id, data);
      }

      const user = await appClient.auth.me();
      return appClient.entities.DailyGoal.create({
        ...data,
        user_id: user.email,
        date: today,
        water_goal_ml: 3000,
        calorie_goal: 2000,
        exercise_minutes_goal: 30,
        fruit_portions: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyGoal', today] });
    }
  });

  const bootstrapExercisesMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || profile?.user_type !== 'user') {
        return { created: 0, skipped: true, reason: 'invalid_profile' };
      }

      const user = await appClient.auth.me();
      const result = await ensurePersonalizedExercisesForProfile(profile, user.email);

      if (!profile.ai_exercises_generated) {
        await appClient.entities.UserProfile.update(profile.id, {
          ai_exercises_generated: true,
          ai_exercises_generated_at: new Date().toISOString()
        });
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });

      if (result?.created > 0) {
        toast({
          title: 'Exercícios personalizados criados',
          description: `${result.created} exercícios foram gerados com IA para seu perfil.`
        });
      }
    }
  });

  useEffect(() => {
    if (!profile?.id || profile?.user_type !== 'user') return;
    if (profile?.ai_exercises_generated) return;
    if (exerciseBootstrapAttempted) return;

    setExerciseBootstrapAttempted(true);
    bootstrapExercisesMutation.mutate();
  }, [
    profile?.id,
    profile?.user_type,
    profile?.ai_exercises_generated,
    exerciseBootstrapAttempted
  ]);

  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;
    const syncMissions = async () => {
      try {
        const user = await appClient.auth.me();
        await QuestService.syncProgressFromSnapshot(user.email, {
          dailyGoal: todayGoal,
          healthData
        });
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ['activeMissions'] });
        }
      } catch {
        // keep silent to avoid noisy UI
      }
    };

    syncMissions();
    return () => {
      cancelled = true;
    };
  }, [
    profile?.id,
    todayGoal?.water_consumed_ml,
    todayGoal?.exercise_minutes_done,
    healthData?.sleep_hours
  ]);

  const handleAddWater = async (amount, xp) => {
    const newWater = (todayGoal?.water_consumed_ml || 0) + amount;
    await updateGoalMutation.mutateAsync({ water_consumed_ml: newWater });

    updateXPMutation.mutate({
      xp,
      actionType: 'water',
      context: { amount_ml: amount, date: today }
    });
  };

  const handleCompleteGoal = async (goalType, xp) => {
    const user = await appClient.auth.me();

    if (goalType === 'exercise') {
      await updateGoalMutation.mutateAsync({
        exercise_minutes_done: todayGoal?.exercise_minutes_goal || 30
      });
      const notification = NotificationTemplates.goalCompleted('30 min de exercício');
      await createNotification(
        user.email,
        notification.type,
        notification.title,
        notification.message,
        notification.actionUrl
      );
    } else if (goalType === 'fruits') {
      await updateGoalMutation.mutateAsync({
        fruit_portions: Math.min(5, (todayGoal?.fruit_portions || 0) + 5)
      });
      const notification = NotificationTemplates.goalCompleted('5 porções de frutas');
      await createNotification(
        user.email,
        notification.type,
        notification.title,
        notification.message,
        notification.actionUrl
      );
    } else if (goalType === 'calories') {
      await updateGoalMutation.mutateAsync({
        calories_consumed: todayGoal?.calorie_goal || 2000
      });
    }

    updateXPMutation.mutate({
      xp,
      actionType: goalType === 'exercise' ? 'workout' : 'nutrition',
      context: { goal_type: goalType, date: today }
    });
  };

  const waterGoal = todayGoal?.water_goal_ml || 3000;
  const waterConsumed = todayGoal?.water_consumed_ml || 0;
  const waterProgress = Math.min(100, (waterConsumed / waterGoal) * 100);
  const currentLevelXP = (profile?.xp || 0) % 100;
  const xpProgress = currentLevelXP;
  const xpNeeded = 100 - currentLevelXP;

  const waterButtons = [
    { amount: 100, xp: 1, label: '+100 ml' },
    { amount: 250, xp: 5, label: '+250 ml' },
    { amount: 500, xp: 10, label: '+500 ml' },
    { amount: 1000, xp: 100, label: '+1 L' }
  ];

  const goalsConfig = useMemo(
    () => [
      {
        icon: Dumbbell,
        title: '30 min de exercício',
        description: 'Movimento diário',
        completed: (todayGoal?.exercise_minutes_done || 0) >= 30,
        xp: 50,
        type: 'exercise'
      },
      {
        icon: Apple,
        title: '5 porções de frutas',
        description: 'Nutrição de qualidade',
        completed: (todayGoal?.fruit_portions || 0) >= 5,
        xp: 30,
        type: 'fruits'
      },
      {
        icon: Flame,
        title: 'Meta de calorias',
        description: 'Consumo dentro do plano',
        completed: (todayGoal?.calories_consumed || 0) >= (todayGoal?.calorie_goal || 2000),
        xp: 40,
        type: 'calories'
      }
    ],
    [todayGoal]
  );

  const completedGoals = goalsConfig.filter((goal) => goal.completed).length;
  const skillTree = profile?.gamification_progression?.skill_tree || {};
  const missionPendingCount = activeMissions.filter((item) => !item.completed).length;

  const kpis = [
    {
      icon: Trophy,
      label: 'Nível atual',
      value: profile?.level || 1
    },
    {
      icon: Zap,
      label: 'XP total',
      value: profile?.xp || 0
    },
    {
      icon: Droplet,
      label: 'Água hoje',
      value: `${(waterConsumed / 1000).toFixed(1)}L`
    },
    {
      icon: Target,
      label: 'Metas',
      value: `${completedGoals}/${goalsConfig.length}`
    }
  ];

  return (
    <div className="app-shell">
      <div className="module-header">
        <div className="app-page !py-8 md:!py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="saas-eyebrow text-emerald-100/95">Painel diário</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-1">Seu progresso em tempo real</h1>
              <p className="text-emerald-50/90 text-sm mt-2">
                Complete metas, acumule XP e evolua seu nível todos os dias.
              </p>
            </div>
            <div className="saas-chip border-white/30 bg-white/20 text-white">
              <Flame size={14} />
              Streak de {calculateStreak()} dias
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {kpis.map((kpi, index) => (
              <motion.article
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="saas-kpi-card p-4 md:p-5 bg-white/95 border-white/45"
                aria-label={kpi.label}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center mb-3">
                  <kpi.icon size={20} />
                </div>
                <p className="saas-kpi-value text-slate-900">{kpi.value}</p>
                <p className="text-xs font-semibold text-slate-600 mt-1">{kpi.label}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>

      <div className="app-page -mt-6 md:-mt-8">
        <div className="grid xl:grid-cols-12 gap-6">
          <section className="xl:col-span-4 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="saas-panel p-5 md:p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-2xl flex items-center justify-center shadow-[0_14px_26px_rgba(16,185,129,0.25)]">
                  {profile?.first_name?.[0] || '?'}
                  {profile?.last_name?.[0] || ''}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-[var(--app-subtle)]">Atleta</p>
                  <h2 className="text-xl font-bold text-[var(--app-ink)] truncate">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-sm text-[var(--app-subtle)]">Nível {profile?.level || 1}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAvatarCustomization(true)}
                className="mt-5 w-full rounded-xl border border-[var(--app-line)] bg-[var(--app-surface-soft)] hover:bg-[color:var(--app-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--app-ink)] flex items-center justify-center gap-2"
              >
                <Palette size={16} />
                Customizar avatar
              </button>

              <div className="saas-panel-soft mt-4 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[var(--app-ink)] flex items-center gap-2">
                    <Zap size={15} className="text-emerald-500" />
                    Experiência
                  </p>
                  <p className="text-sm font-bold text-[var(--app-ink)]">{currentLevelXP}/100</p>
                </div>
                <div className="saas-progress-track">
                  <motion.div
                    className="saas-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 0.45 }}
                  />
                </div>
                <p className="text-xs text-[var(--app-subtle)] mt-2">{xpNeeded} XP para o próximo nível</p>
              </div>

              <div className="saas-panel-soft mt-4 p-4">
                <p className="text-sm font-semibold text-[var(--app-ink)] mb-2">Skill tree</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white/70 px-2 py-1.5 border border-[var(--app-line)]">
                    Forca: <strong>{skillTree.strength || 0}</strong>
                  </div>
                  <div className="rounded-lg bg-white/70 px-2 py-1.5 border border-[var(--app-line)]">
                    Sono: <strong>{skillTree.sleep || 0}</strong>
                  </div>
                  <div className="rounded-lg bg-white/70 px-2 py-1.5 border border-[var(--app-line)]">
                    Nutrição: <strong>{skillTree.nutrition || 0}</strong>
                  </div>
                  <div className="rounded-lg bg-white/70 px-2 py-1.5 border border-[var(--app-line)]">
                    Mente: <strong>{skillTree.mind || 0}</strong>
                  </div>
                </div>
              </div>
            </motion.div>

            {profile?.wearable_data?.connected && healthData ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="saas-panel p-5 md:p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title flex items-center gap-2">
                    <Activity className="text-blue-500" size={20} />
                    Saúde hoje
                  </h3>
                  <span className="text-xs text-[var(--app-subtle)]">
                    {profile?.wearable_data?.device_type || 'Wearable'}
                  </span>
                </div>
                <HealthDataWidget healthData={healthData} />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="saas-panel p-5 md:p-6"
              >
                <WearableConnection profile={profile} />
              </motion.div>
            )}
          </section>

          <section className="xl:col-span-8 space-y-6">
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="saas-panel p-5 md:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h3 className="section-title flex items-center gap-2">
                  <Droplet className="text-sky-500" size={22} />
                  Hidratação
                </h3>
                <div className="saas-chip">
                  <Zap size={14} />
                  XP em tempo real
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5 items-start">
                <div className="saas-panel-soft p-5">
                  <div className="flex items-end justify-between gap-3 mb-3">
                    <p className="text-3xl font-extrabold text-[var(--app-ink)]">
                      {(waterConsumed / 1000).toFixed(1)}L
                    </p>
                    <p className="text-sm text-[var(--app-subtle)]">Meta {(waterGoal / 1000).toFixed(1)}L</p>
                  </div>
                  <div className="saas-progress-track">
                    <div className="saas-progress-fill" style={{ width: `${waterProgress}%` }} />
                  </div>
                  <p className="text-xs text-[var(--app-subtle)] mt-2">{Math.round(waterProgress)}% concluido</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {waterButtons.map((button) => (
                    <button
                      key={button.amount}
                      type="button"
                      onClick={() => handleAddWater(button.amount, button.xp)}
                      className="saas-panel-soft p-3 text-left hover:shadow-[var(--app-shadow-2)] transition-shadow"
                    >
                      <p className="text-sm font-bold text-[var(--app-ink)]">{button.label}</p>
                      <p className="text-xs text-[var(--app-subtle)] mt-1">+{button.xp} XP</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.article>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="space-y-4"
            >
              <h3 className="section-title flex items-center gap-2">
                <Target className="text-emerald-600" size={22} />
                Metas de hoje
              </h3>

              <div className="grid md:grid-cols-3 gap-4">
                {goalsConfig.map((goal) => (
                  <article
                    key={goal.type}
                    className={`saas-panel p-4 ${
                      goal.completed ? 'border-emerald-300 dark:border-emerald-500/45' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-[var(--app-surface-soft)] border border-[var(--app-line)] flex items-center justify-center">
                        <goal.icon size={20} className={goal.completed ? 'text-emerald-600' : 'text-[var(--app-subtle)]'} />
                      </div>
                      {goal.completed ? (
                        <span className="saas-chip">
                          <Check size={13} />
                          Concluida
                        </span>
                      ) : (
                        <span className="saas-chip border-slate-300/60 bg-slate-100/70 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-200">
                          <X size={13} />
                          Pendente
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-[var(--app-ink)] mt-3">{goal.title}</h4>
                    <p className="text-xs text-[var(--app-subtle)] mt-1">{goal.description}</p>

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-[var(--app-subtle)]">Recompensa</p>
                      <div className="saas-chip">
                        <Zap size={13} />
                        +{goal.xp}
                      </div>
                    </div>

                    {!goal.completed && (
                      <button
                        type="button"
                        onClick={() => handleCompleteGoal(goal.type, goal.xp)}
                        className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold px-4 py-2.5 hover:opacity-95"
                      >
                        Concluir meta
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="saas-panel p-5 md:p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="section-title flex items-center gap-2">
                  <Target className="text-violet-600" size={22} />
                  Missoes dinamicas
                </h3>
                <span className="saas-chip">
                  {missionPendingCount} pendente(s)
                </span>
              </div>

              {activeMissions.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {activeMissions.slice(0, 4).map((mission) => {
                    const goalValue = Number(mission.goal_value || 0);
                    const progressValue = Number(mission.progress || 0);
                    const progress = goalValue > 0
                      ? Math.min(100, (progressValue / goalValue) * 100)
                      : 0;
                    const isClaimable = mission.completed && !mission.claimed;

                    return (
                      <article
                        key={mission.user_challenge_id || mission.id}
                        className="rounded-xl border border-[var(--app-line)] bg-[var(--app-surface-soft)] p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-[var(--app-ink)]">{mission.title}</p>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {mission.mission_type === 'weekly' ? 'Semanal' : 'Diária'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--app-subtle)] mt-1">
                          {progressValue}/{goalValue} progresso
                        </p>

                        <div className="saas-progress-track mt-2">
                          <div className="saas-progress-fill" style={{ width: `${progress}%` }} />
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-amber-700 font-semibold">+{mission.xp_reward || 0} XP</span>
                          {isClaimable ? (
                            <button
                              type="button"
                              onClick={() => claimMissionMutation.mutate(mission.user_challenge_id || mission.id)}
                              disabled={claimMissionMutation.isPending}
                              className="rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold px-3 py-1.5 hover:opacity-95 disabled:opacity-60"
                            >
                              Resgatar
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--app-subtle)]">
                              {mission.claimed ? 'Resgatada' : mission.completed ? 'Pronta' : 'Em andamento'}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--app-subtle)]">
                  As missoes serao geradas automaticamente conforme seu perfil.
                </p>
              )}
            </motion.section>

            <article className="saas-gamified-banner p-4 md:p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="saas-eyebrow text-emerald-700 dark:text-emerald-300">Gamificação</p>
                <p className="text-base font-bold text-[var(--app-ink)]">
                  {completedGoals}/{goalsConfig.length} metas concluidas hoje
                </p>
              </div>
              <div className="saas-chip">
                <Trophy size={14} />
                Continue para subir de nível
              </div>
            </article>
          </section>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {xpAnimation ? `Você ganhou ${xpAnimation.amount} XP` : 'XP atualizado'}
      </div>

      <AnimatePresence>
        {xpAnimation && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -60, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${xpAnimation.x}%`,
              top: `${xpAnimation.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full shadow-lg font-bold text-sm">
              <Zap size={16} />
              <span>+{xpAnimation.amount} XP</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {levelUpAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Subida de nível"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="saas-panel max-w-md w-full p-8 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white flex items-center justify-center shadow-[0_16px_28px_rgba(245,158,11,0.35)]">
                <Trophy size={36} />
              </div>
              <h2 className="text-3xl font-extrabold text-[var(--app-ink)]">Nível {profile?.level} alcancado</h2>
              <p className="text-sm text-[var(--app-subtle)] mt-2">Parabens, sua evolução foi registrada.</p>
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold">
                <Star size={16} />
                Continue assim
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {badgeUnlockedAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Conquista desbloqueada"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="saas-panel max-w-md w-full p-8 text-center"
            >
              <div className="text-6xl mb-4">{badgeUnlockedAnimation.icon || '🏅'}</div>
              <h2 className="text-2xl font-extrabold text-[var(--app-ink)]">Nova conquista</h2>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-300 mt-1">{badgeUnlockedAnimation.name}</p>
              <p className="text-sm text-[var(--app-subtle)] mt-2">{badgeUnlockedAnimation.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-semibold">
                <Zap size={14} />
                +{badgeUnlockedAnimation.xp_reward} XP
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AvatarCustomization
        profile={profile}
        isOpen={showAvatarCustomization}
        onClose={() => setShowAvatarCustomization(false)}
      />
    </div>
  );
}
