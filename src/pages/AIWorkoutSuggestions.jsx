import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Zap, Target, Clock, TrendingUp, CheckCircle } from 'lucide-react';

export default function AIWorkoutSuggestions() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [generationError, setGenerationError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const profile = profiles?.[0];

  const { data: recentSessions } = useQuery({
    queryKey: ['recentSessions'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.WorkoutSession.filter({ user_id: user.email }, '-date', 10);
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: exerciseLogs } = useQuery({
    queryKey: ['exerciseLogs'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.ExerciseLog.filter({ user_id: user.email }, '-date', 30);
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: healthData } = useQuery({
    queryKey: ['healthData'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.HealthData.filter({ user_id: user.email }, '-date', 7);
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: exercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      const allExercises = await appClient.entities.Exercise.list();
      return allExercises.filter(
        (exercise) =>
          !exercise.personalized_for_user || exercise.personalized_for_user === user.email
      );
    },
    enabled: !!currentUser,
    initialData: []
  });

  const generateWorkoutMutation = useMutation({
    mutationFn: async (suggestedRoutine) => {
      const user = await appClient.auth.me();
      return appClient.entities.WorkoutRoutine.create({
        user_id: user.email,
        name: suggestedRoutine.name,
        description: suggestedRoutine.description,
        goal: suggestedRoutine.goal,
        exercises: suggestedRoutine.exercises,
        days_per_week: suggestedRoutine.days_per_week,
        duration_minutes: suggestedRoutine.duration_minutes,
        is_active: true,
        created_by_ai: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutRoutines'] });
      toast({
        title: 'Rotina salva',
        description: 'A rotina foi salva com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Falha ao salvar rotina',
        description: error?.message || 'Não foi possível salvar a rotina agora.',
        variant: 'destructive'
      });
    }
  });

  const buildFallbackSuggestions = ({ profileData, availableExercises, avgSleepHours }) => {
    const safeExercises = Array.isArray(availableExercises) ? availableExercises : [];
    const goal = profileData?.goal || 'health';

    const categoriesByGoal = {
      weight_loss: ['cardio', 'hiit', 'strength', 'flexibility'],
      muscle_gain: ['strength', 'strength', 'balance', 'flexibility'],
      weight_gain: ['strength', 'strength', 'balance', 'cardio'],
      health: ['balance', 'cardio', 'strength', 'flexibility']
    };

    const preferredCategories = categoriesByGoal[goal] || categoriesByGoal.health;

    const pickExercises = (preferredCategory, count = 6) => {
      const byCategory = safeExercises.filter((exercise) => exercise?.category === preferredCategory);
      const others = safeExercises.filter((exercise) => exercise?.category !== preferredCategory);
      const pool = [...byCategory, ...others].slice(0, count);

      return pool.map((exercise, index) => ({
        exercise_id: exercise?.id || '',
        exercise_name: exercise?.name || `Exercício ${index + 1}`,
        sets: preferredCategory === 'cardio' ? 4 : 3,
        reps: preferredCategory === 'cardio' ? 15 : 12,
        rest_seconds: preferredCategory === 'hiit' ? 45 : 60,
        notes: preferredCategory === 'flexibility' ? 'Movimento controlado e respiração profunda.' : 'Mantenha técnica e progressão semanal.'
      }));
    };

    const routines = [
      {
        name: 'Dia 1 - Base',
        day_type: 'treino_leve',
        description: 'Sessão de adaptação com foco técnico.',
        goal,
        level: String(profileData?.level || 1),
        focus_notes: 'Ajuste de carga e postura para evolução consistente.',
        exercises: pickExercises(preferredCategories[0], 6),
        duration_minutes: 40,
        days_per_week: 4
      },
      {
        name: 'Dia 2 - Progressão',
        day_type: 'treino_intenso',
        description: 'Sessão principal com progressão de intensidade.',
        goal,
        level: String(profileData?.level || 1),
        focus_notes: 'Priorize qualidade do movimento antes de aumentar volume.',
        exercises: pickExercises(preferredCategories[1], 6),
        duration_minutes: 50,
        days_per_week: 4
      },
      {
        name: 'Dia 3 - Recuperação',
        day_type: avgSleepHours < 6 ? 'descanso' : 'recuperacao_ativa',
        description: avgSleepHours < 6 ? 'Descanso para consolidar recuperação.' : 'Recuperação ativa com mobilidade e baixa intensidade.',
        goal,
        level: String(profileData?.level || 1),
        focus_notes: 'Hidratação e sono são prioridade.',
        exercises: avgSleepHours < 6 ? [] : pickExercises(preferredCategories[3], 5),
        duration_minutes: avgSleepHours < 6 ? 20 : 30,
        days_per_week: 4
      },
      {
        name: 'Dia 4 - Consolidação',
        day_type: 'treino_leve',
        description: 'Sessão final para consolidar semana e manter constância.',
        goal,
        level: String(profileData?.level || 1),
        focus_notes: 'Encerrar semana com volume controlado.',
        exercises: pickExercises(preferredCategories[2], 6),
        duration_minutes: 45,
        days_per_week: 4
      }
    ];

    return {
      weekly_plan: {
        title: 'Plano de Treino Semanal',
        description: 'Plano base gerado localmente com base no seu perfil.',
        recovery_notes: 'Mantenha hidratação diária, sono regular e ajuste a intensidade conforme sua energia.'
      },
      routines
    };
  };

  const generateSuggestions = async () => {
    if (!currentUser) {
      toast({
        title: 'Sessão não encontrada',
        description: 'Entre novamente para gerar seu plano.',
        variant: 'destructive'
      });
      return;
    }

    if (!profile) {
      toast({
        title: 'Complete seu perfil',
        description: 'Preencha idade, peso, altura e objetivo para gerar um plano.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setGenerationError('');

    try {
      const exerciseFrequency = {};
      exerciseLogs.forEach((log) => {
        exerciseFrequency[log.exercise_name] = (exerciseFrequency[log.exercise_name] || 0) + 1;
      });

      const mostUsedExercises = Object.entries(exerciseFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      const avgSteps = healthData.length > 0
        ? Math.round(healthData.reduce((sum, d) => sum + (d.steps || 0), 0) / healthData.length)
        : 0;
      const avgSleep = healthData.length > 0
        ? Math.round(healthData.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / healthData.length * 10) / 10
        : 0;
      const recentActivity = healthData.length > 0
        ? Math.round(healthData.reduce((sum, d) => sum + (d.active_minutes || 0), 0) / healthData.length)
        : 0;

      if (!Array.isArray(exercises) || exercises.length === 0) {
        throw new Error('Não há exercícios cadastrados para montar o plano.');
      }

      const prompt = `
Você é um personal trainer e especialista em ciências do esporte. Crie um PLANO SEMANAL COMPLETO de treino personalizado.

PERFIL DO USUÁRIO:
- Objetivo: ${profile?.goal === 'weight_loss' ? 'Perda de peso' : profile?.goal === 'muscle_gain' ? 'Ganho de massa muscular' : profile?.goal === 'health' ? 'Saúde geral' : 'Condicionamento físico'}
- Idade: ${profile?.age || 'Não informado'} anos
- Peso: ${profile?.weight || 'Não informado'} kg
- Altura: ${profile?.height || 'Não informado'} cm
- Nível de experiência: ${profile?.level || 1}

HISTORICO DE TREINOS (últimos 10 dias):
- Total de sessões: ${recentSessions.length}
- Rotinas realizadas: ${recentSessions.slice(0, 5).map((s) => s.routine_name).join(', ') || 'Nenhum treino recente'}
- Exercícios mais praticados: ${mostUsedExercises.join(', ') || 'Nenhum'}

DADOS DE SAUDE (última semana):
- Passos médios diários: ${avgSteps}
- Sono médio: ${avgSleep} horas
- Minutos ativos médios: ${recentActivity}
- Indicador: ${avgSleep < 6 ? 'BAIXA recuperação - priorizar treinos leves' : avgSleep < 7 ? 'recuperação moderada' : 'BOA recuperação'}

EXERCÍCIOS DISPONÍVEIS:
${exercises.slice(0, 30).map((e) => `- ${e.name} (${e.category}, ${e.muscle_group}, ${e.difficulty})`).join('\n')}

INSTRUCOES PARA O PLANO:
1. Crie um plano semanal de 7 dias com 3-5 treinos
2. Varie exercícios e reduza repetição dos mais usados (${mostUsedExercises.slice(0, 3).join(', ')})
3. Inclua dias de descanso ativo conforme o sono
4. Ajuste intensidade baseada no nível de atividade atual
5. Para cada dia, especifique se é treino intenso, leve, recuperação ativa ou descanso
6. Use periodização entre alta e baixa intensidade
7. Inclua aquecimento e alongamento final

Crie rotinas com:
- Nome do dia
- Tipo do dia: "treino_intenso", "treino_leve", "recuperacao_ativa", "descanso"
- 5-8 exercícios da lista
- Séries, repetições e descanso
- Notas de intensidade
- Duração total
- Dicas de recuperação
`;

      const response = await appClient.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            weekly_plan: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                recovery_notes: { type: 'string' }
              }
            },
            routines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  day_type: { type: 'string' },
                  description: { type: 'string' },
                  goal: { type: 'string' },
                  level: { type: 'string' },
                  focus_notes: { type: 'string' },
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        exercise_name: { type: 'string' },
                        sets: { type: 'number' },
                        reps: { type: 'number' },
                        rest_seconds: { type: 'number' },
                        intensity_note: { type: 'string' }
                      }
                    }
                  },
                  duration_minutes: { type: 'number' },
                  days_per_week: { type: 'number' }
                }
              }
            }
          }
        }
      });

      if (!response || typeof response !== 'object') {
        throw new Error('Resposta inválida da IA.');
      }

      const rawRoutines = Array.isArray(response.routines) ? response.routines : [];
      const fallbackSuggestions = buildFallbackSuggestions({
        profileData: profile,
        availableExercises: exercises,
        avgSleepHours: avgSleep
      });

      const sourceRoutines = rawRoutines.length > 0 ? rawRoutines : fallbackSuggestions.routines;
      const planData = response?.weekly_plan && typeof response.weekly_plan === 'object'
        ? response.weekly_plan
        : fallbackSuggestions.weekly_plan;

      if (!Array.isArray(sourceRoutines) || sourceRoutines.length === 0) {
        throw new Error('Não foi possível montar rotinas suficientes neste momento.');
      }

      if (rawRoutines.length === 0) {
        toast({
          title: 'Plano base aplicado',
          description: 'A IA não retornou rotinas completas. Um plano local foi gerado.'
        });
      }

      const enrichedRoutines = sourceRoutines.map((routine) => ({
        ...routine,
        weekly_plan: planData,
        exercises: (routine.exercises || []).map((ex, exerciseIndex) => {
          const exerciseName =
            typeof ex?.exercise_name === 'string' && ex.exercise_name.trim()
              ? ex.exercise_name.trim()
              : exercises?.[exerciseIndex]?.name || `Exercício ${exerciseIndex + 1}`;

          const foundExercise = exercises.find((e) =>
            String(e?.name || '').toLowerCase() === exerciseName.toLowerCase()
          );

          return {
            exercise_id: foundExercise?.id || '',
            exercise_name: exerciseName,
            sets: ex.sets || 3,
            reps: ex.reps || 12,
            rest_seconds: ex.rest_seconds || 60,
            notes: ex.intensity_note || ''
          };
        })
      }));

      setSuggestions({
        plan: planData,
        routines: enrichedRoutines
      });

      toast({
        title: 'Plano gerado',
        description: 'Seu novo plano semanal foi criado com sucesso.'
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      const message = error?.message || 'Falha ao gerar plano de treino.';
      setGenerationError(message);
      toast({
        title: 'Falha ao gerar treino',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveRoutine = async (routine) => {
    await generateWorkoutMutation.mutateAsync(routine);
  };

  const goalMapping = {
    strength: 'Força',
    endurance: 'Resistência',
    weight_loss: 'Perda de Peso',
    muscle_gain: 'Ganho de Massa',
    general_fitness: 'Condicionamento'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50/20 pb-20 md:pb-8">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Zap size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Sugestões IA</h1>
                <p className="text-amber-100">Treinos personalizados por inteligência artificial</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {generationError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {generationError}
          </div>
        )}

        {!suggestions ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-12 text-center"
          >
            <Zap className="mx-auto mb-6 text-amber-500" size={64} />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Gerar Treinos Personalizados
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Nossa IA vai analisar seu perfil, objetivos e histórico de atividades para criar
              rotinas de treino totalmente personalizadas para você.
            </p>
            
            {profile && (
              <div className="grid md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                <div className="p-4 bg-amber-50 rounded-xl">
                  <Target className="mx-auto mb-2 text-amber-600" size={24} />
                  <p className="text-sm font-medium text-gray-700">Objetivo</p>
                  <p className="text-lg font-bold text-gray-800">
                    {profile.goal === 'weight_loss' ? 'Perda de peso' : 
                     profile.goal === 'muscle_gain' ? 'Ganho de massa' : 'Saúde'}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <TrendingUp className="mx-auto mb-2 text-amber-600" size={24} />
                  <p className="text-sm font-medium text-gray-700">Nível</p>
                  <p className="text-lg font-bold text-gray-800">{profile.level}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <Clock className="mx-auto mb-2 text-amber-600" size={24} />
                  <p className="text-sm font-medium text-gray-700">Treinos Recentes</p>
                  <p className="text-lg font-bold text-gray-800">{recentSessions.length}</p>
                </div>
              </div>
            )}

            {!profile && (
              <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 max-w-2xl mx-auto">
                Complete seu perfil (idade, peso, altura e objetivo) para gerar um plano de treino personalizado.
              </div>
            )}

            <Button
              onClick={generateSuggestions}
              disabled={isGenerating}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-lg px-8 py-6"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="mr-2 animate-spin" />
                  Gerando sugestões...
                </>
              ) : (
                <>
                  <Zap size={20} className="mr-2" />
                  Gerar Treinos com IA
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Seu Plano Semanal</h2>
              <Button
                variant="outline"
                onClick={generateSuggestions}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Novo Plano'
                )}
              </Button>
            </div>

            {suggestions.plan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-8 border-2 border-amber-200"
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-3">{suggestions.plan.title}</h3>
                <p className="text-gray-700 mb-4">{suggestions.plan.description}</p>
                {suggestions.plan.recovery_notes && (
                  <div className="p-4 bg-white/60 rounded-xl">
                    <p className="text-sm font-medium text-amber-900">Dicas de recuperação</p>
                    <p className="text-sm text-gray-700 mt-1">{suggestions.plan.recovery_notes}</p>
                  </div>
                )}
              </motion.div>
            )}

            {suggestions.routines?.map((routine, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-8"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-800">{routine.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        routine.day_type === 'treino_intenso' ? 'bg-red-100 text-red-700' :
                        routine.day_type === 'treino_leve' ? 'bg-green-100 text-green-700' :
                        routine.day_type === 'recuperacao_ativa' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {routine.day_type === 'treino_intenso' ? 'Intenso' :
                         routine.day_type === 'treino_leve' ? 'Leve' :
                         routine.day_type === 'recuperacao_ativa' ? 'Recuperação' : 'Descanso'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{routine.description}</p>
                    {routine.focus_notes && (
                      <p className="text-sm text-amber-700 mb-3 italic">Foco: {routine.focus_notes}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Objetivo: {goalMapping[routine.goal] || routine.goal}</span>
                      <span>|</span>
                      <span>Duração: {routine.duration_minutes} min</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => saveRoutine(routine)}
                    disabled={generateWorkoutMutation.isPending}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  >
                    {generateWorkoutMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} className="mr-2" />
                        Salvar Rotina
                      </>
                    )}
                  </Button>
                </div>

                {routine.day_type !== 'descanso' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700">Exercícios:</h4>
                    {routine.exercises.map((ex, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-gray-800">{ex.exercise_name}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{ex.sets} séries</span>
                          <span>|</span>
                          <span>{ex.reps} reps</span>
                          <span>|</span>
                          <span>{ex.rest_seconds}s descanso</span>
                        </div>
                        {ex.notes && (
                          <p className="text-sm text-amber-600 mt-2 italic">{ex.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


