import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Star,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { appClient } from '@/api/appClient';
import AvatarEvolution from '@/components/avatar/AvatarEvolution';

export default function Goals() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingGoal, setEditingGoal] = useState(null);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: user.email });
    }
  });

  const profile = profiles?.[0];

  const { data: goals } = useQuery({
    queryKey: ['dailyGoal', dateStr],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.DailyGoal.filter({
        created_by: user.email,
        date: dateStr
      });
    }
  });

  const todayGoal = goals?.[0];

  const updateGoalMutation = useMutation({
    mutationFn: async (data) => {
      if (todayGoal) return appClient.entities.DailyGoal.update(todayGoal.id, data);
      const user = await appClient.auth.me();
      return appClient.entities.DailyGoal.create({
        ...data,
        user_id: user.email,
        date: dateStr
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyGoal', dateStr] });
      setEditingGoal(null);
    }
  });

  const goalTypes = [
    {
      key: 'water',
      icon: Droplets,
      title: 'Hidratação',
      subtitle: 'Meta de água diária',
      iconTone: 'text-sky-600',
      iconBg: 'bg-sky-100 dark:bg-sky-500/20',
      goalField: 'water_goal_ml',
      consumedField: 'water_consumed_ml',
      unit: 'ml',
      defaultGoal: 2000
    },
    {
      key: 'calories',
      icon: Flame,
      title: 'Calorias',
      subtitle: 'Meta de calorias',
      iconTone: 'text-orange-600',
      iconBg: 'bg-orange-100 dark:bg-orange-500/20',
      goalField: 'calorie_goal',
      consumedField: 'calories_consumed',
      unit: 'kcal',
      defaultGoal: 2000
    },
    {
      key: 'exercise',
      icon: Dumbbell,
      title: 'Exercícios',
      subtitle: 'Minutos de atividade',
      iconTone: 'text-violet-600',
      iconBg: 'bg-violet-100 dark:bg-violet-500/20',
      goalField: 'exercise_minutes_goal',
      consumedField: 'exercise_minutes_done',
      unit: 'min',
      defaultGoal: 30
    }
  ];

  const handleSaveGoal = (goalType, value) => {
    updateGoalMutation.mutate({ [goalType.goalField]: Number(value) });
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="app-shell pb-24">
      <div className="module-header pt-8 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-white text-2xl md:text-3xl font-extrabold">Minhas metas</h1>
              <p className="text-emerald-50/90 text-sm mt-1">Configure seus objetivos diários com padrao SaaS</p>
            </div>
            <AvatarEvolution
              level={profile?.level || 1}
              xp={profile?.xp || 0}
              size="sm"
              showStats={false}
            />
          </div>

          <div className="rounded-2xl border border-white/30 bg-white/15 backdrop-blur-sm p-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-white/15 rounded-full transition-colors"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="text-white" size={22} />
            </button>

            <div className="text-center">
              <p className="text-white font-bold">
                {isToday ? 'Hoje' : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-emerald-50/90 text-sm">{format(selectedDate, 'EEEE', { locale: ptBR })}</p>
            </div>

            <button
              type="button"
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-white/15 rounded-full transition-colors disabled:opacity-45"
              disabled={isToday}
              aria-label="Próximo dia"
            >
              <ChevronRight className="text-white" size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="app-page max-w-3xl -mt-8">
        <div className="space-y-4">
          {goalTypes.map((goalType, idx) => {
            const goalValue = todayGoal?.[goalType.goalField] || goalType.defaultGoal;
            const consumedValue = todayGoal?.[goalType.consumedField] || 0;
            const percentage = Math.min((consumedValue / goalValue) * 100, 100);
            const isComplete = percentage >= 100;
            const isEditing = editingGoal === goalType.key;

            return (
              <motion.article
                key={goalType.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`saas-panel overflow-hidden ${
                  isComplete ? 'border-emerald-300 dark:border-emerald-500/45' : ''
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${goalType.iconBg}`}>
                        <goalType.icon className={goalType.iconTone} size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--app-ink)]">{goalType.title}</h3>
                        <p className="text-sm text-[var(--app-subtle)]">{goalType.subtitle}</p>
                      </div>
                    </div>

                    {isComplete && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="saas-chip"
                      >
                        <Check size={14} />
                        100%
                      </motion.div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2 gap-2">
                      <span className="font-semibold text-[var(--app-ink)]">
                        {consumedValue} {goalType.unit}
                      </span>
                      <span className="text-[var(--app-subtle)]">
                        Meta: {goalValue} {goalType.unit}
                      </span>
                    </div>
                    <div className="saas-progress-track">
                      <motion.div
                        className="saas-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-xs text-[var(--app-subtle)] mt-1 text-right">
                      {Math.round(percentage)}% concluido
                    </p>
                  </div>

                  <AnimatePresence>
                    {isEditing ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        <div>
                          <Label className="text-sm text-[var(--app-subtle)]">Nova meta ({goalType.unit})</Label>
                          <Input
                            type="number"
                            defaultValue={goalValue}
                            id={`goal-${goalType.key}`}
                            className="mt-1 bg-[var(--app-surface)] border-[var(--app-line)]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingGoal(null)}
                            className="flex-1 border-[var(--app-line)]"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`goal-${goalType.key}`);
                              handleSaveGoal(goalType, input?.value || goalValue);
                            }}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95"
                          >
                            Salvar
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingGoal(goalType.key)}
                        className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                          isComplete
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/45 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'border-[var(--app-line)] bg-[var(--app-surface-soft)] text-[var(--app-subtle)] hover:text-[var(--app-ink)]'
                        }`}
                      >
                        Editar meta
                      </button>
                    )}
                  </AnimatePresence>
                </div>

                {isComplete && (
                  <div className="saas-gamified-banner px-5 py-3 flex items-center gap-2 rounded-none border-x-0 border-b-0">
                    <Trophy size={17} />
                    <span className="text-sm font-semibold">Meta concluida! +50 XP</span>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="saas-gamified-banner mt-6 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} />
            <h3 className="font-bold">Resumo semanal</h3>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => {
              const isActive = idx <= new Date().getDay();
              return (
                <div key={day + idx} className="text-center">
                  <span className="text-xs opacity-80">{day}</span>
                  <div className={`w-8 h-8 mx-auto mt-1 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-emerald-500/25' : 'bg-white/35 dark:bg-slate-500/20'
                  }`}
                  >
                    {isActive && <Star size={13} />}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-sm mt-4">
            Você concluiu <strong>{new Date().getDay() + 1} dias</strong> de metas nesta semana.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
