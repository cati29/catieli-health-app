import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { 
  Utensils, Sparkles, Calendar, ChevronRight, Clock,
  Flame, Apple, Loader2, CheckCircle2
} from 'lucide-react';

const GOAL_LABELS = {
  weight_loss: 'Emagrecimento',
  weight_gain: 'Ganho de peso',
  muscle_gain: 'Ganho de massa',
  health: 'Saúde',
  other: 'Outros'
};

const QUESTIONNAIRE_BY_GOAL = {
  weight_loss: [
    {
      id: 'activity_level',
      label: 'Nível de atividade física',
      type: 'select',
      options: [
        { value: 'sedentary', label: 'Sedentário' },
        { value: 'light', label: 'Leve (1-2x semana)' },
        { value: 'moderate', label: 'Moderado (3-4x semana)' },
        { value: 'intense', label: 'Intenso (5x+ semana)' }
      ]
    },
    {
      id: 'meal_frequency',
      label: 'Quantas refeições por dia você prefere?',
      type: 'select',
      options: [
        { value: '3', label: '3 refeições' },
        { value: '4', label: '4 refeições' },
        { value: '5', label: '5 refeições' }
      ]
    },
    {
      id: 'hunger_peak',
      label: 'Em qual período sente mais fome?',
      type: 'select',
      options: [
        { value: 'morning', label: 'Manhã' },
        { value: 'afternoon', label: 'Tarde' },
        { value: 'night', label: 'Noite' }
      ]
    },
    {
      id: 'food_triggers',
      label: 'Quais alimentos te tiram do plano? (opcional)',
      type: 'text',
      placeholder: 'Ex: doce, fast food, refrigerante'
    }
  ],
  weight_gain: [
    {
      id: 'training_days',
      label: 'Quantos dias de treino por semana?',
      type: 'select',
      options: [
        { value: '0-1', label: '0-1 dias' },
        { value: '2-3', label: '2-3 dias' },
        { value: '4-5', label: '4-5 dias' },
        { value: '6-7', label: '6-7 dias' }
      ]
    },
    {
      id: 'appetite_level',
      label: 'Como está seu apetite atualmente?',
      type: 'select',
      options: [
        { value: 'low', label: 'Baixo' },
        { value: 'medium', label: 'Médio' },
        { value: 'high', label: 'Alto' }
      ]
    },
    {
      id: 'meal_frequency',
      label: 'Quantas refeições por dia você consegue fazer?',
      type: 'select',
      options: [
        { value: '4', label: '4 refeições' },
        { value: '5', label: '5 refeições' },
        { value: '6', label: '6 refeições' },
        { value: '7', label: '7 refeições' }
      ]
    },
    {
      id: 'digestive_sensitivity',
      label: 'Tem sensibilidade digestiva? (opcional)',
      type: 'text',
      placeholder: 'Ex: lácteos, leguminosas, fibras em excesso'
    }
  ],
  muscle_gain: [
    {
      id: 'strength_training_days',
      label: 'Dias de treino de força por semana',
      type: 'select',
      options: [
        { value: '2-3', label: '2-3 dias' },
        { value: '4-5', label: '4-5 dias' },
        { value: '6+', label: '6 dias ou mais' }
      ]
    },
    {
      id: 'protein_preference',
      label: 'Fonte proteica principal',
      type: 'select',
      options: [
        { value: 'mixed', label: 'Mista (animal e vegetal)' },
        { value: 'animal', label: 'Maioria animal' },
        { value: 'plant', label: 'Maioria vegetal' }
      ]
    },
    {
      id: 'post_workout_window',
      label: 'Consegue fazer refeição pós-treino em até 1h?',
      type: 'select',
      options: [
        { value: 'yes', label: 'Sim' },
        { value: 'sometimes', label: 'Às vezes' },
        { value: 'no', label: 'Não' }
      ]
    },
    {
      id: 'supplement_notes',
      label: 'Suplementos que usa ou quer usar (opcional)',
      type: 'text',
      placeholder: 'Ex: whey, creatina, sem suplementos'
    }
  ],
  health: [
    {
      id: 'health_focus',
      label: 'Qual foco principal de saúde?',
      type: 'select',
      options: [
        { value: 'energy', label: 'Mais energia no dia' },
        { value: 'digestion', label: 'Melhor digestão' },
        { value: 'heart', label: 'Saúde cardiovascular' },
        { value: 'metabolic', label: 'Controle metabólico' }
      ]
    },
    {
      id: 'sleep_quality',
      label: 'Como está seu sono?',
      type: 'select',
      options: [
        { value: 'poor', label: 'Ruim' },
        { value: 'ok', label: 'Regular' },
        { value: 'good', label: 'Bom' }
      ]
    },
    {
      id: 'cooking_time',
      label: 'Tempo médio para cozinhar por refeição',
      type: 'select',
      options: [
        { value: '15', label: 'Até 15 min' },
        { value: '30', label: 'Até 30 min' },
        { value: '45+', label: '45 min ou mais' }
      ]
    },
    {
      id: 'medical_notes',
      label: 'Observações de saúde (opcional)',
      type: 'text',
      placeholder: 'Ex: pressão alta, pré-diabetes, gastrite'
    }
  ],
  other: [
    {
      id: 'priority',
      label: 'Qual sua prioridade atual?',
      type: 'select',
      options: [
        { value: 'routine', label: 'Organizar rotina alimentar' },
        { value: 'performance', label: 'Melhorar desempenho' },
        { value: 'body_comp', label: 'Melhorar composição corporal' }
      ]
    },
    {
      id: 'meal_frequency',
      label: 'Quantas refeições por dia você prefere?',
      type: 'select',
      options: [
        { value: '3', label: '3 refeições' },
        { value: '4', label: '4 refeições' },
        { value: '5', label: '5 refeições' }
      ]
    },
    {
      id: 'routine_notes',
      label: 'Detalhes importantes para a dieta (opcional)',
      type: 'text',
      placeholder: 'Ex: trabalho noturno, pouco tempo para cozinhar'
    }
  ]
};

const getQuestionnaireByGoal = (goal) => QUESTIONNAIRE_BY_GOAL[goal] || QUESTIONNAIRE_BY_GOAL.other;

const buildInitialQuestionnaireAnswers = (questions = []) =>
  questions.reduce((acc, question) => {
    if (question.type === 'select' && Array.isArray(question.options) && question.options.length > 0) {
      acc[question.id] = question.options[0].value;
      return acc;
    }
    acc[question.id] = '';
    return acc;
  }, {});

export default function MealPlans() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [restrictions, setRestrictions] = useState('');
  const [useQuestionnaire, setUseQuestionnaire] = useState(false);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch user profile
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
  const goalKey = profile?.goal || 'other';
  const goalLabel = GOAL_LABELS[goalKey] || GOAL_LABELS.other;
  const questionnaire = getQuestionnaireByGoal(goalKey);

  useEffect(() => {
    if (!showGenerator) return;
    setUseQuestionnaire(false);
    setQuestionnaireAnswers(buildInitialQuestionnaireAnswers(questionnaire));
  }, [showGenerator, goalKey]);

  // Fetch meal plans
  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.MealPlan.filter({ user_id: user.email }, '-created_date');
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch meals for selected plan
  const { data: meals } = useQuery({
    queryKey: ['meals', selectedPlan?.id],
    queryFn: () => appClient.entities.Meal.filter({ meal_plan_id: selectedPlan.id }),
    enabled: !!selectedPlan,
    initialData: []
  });

  const buildQuestionnaireContext = () => {
    if (!useQuestionnaire) {
      return 'Questionário não preenchido pelo usuário. Utilize apenas o perfil base.';
    }

    return questionnaire
      .map((question) => {
        const rawAnswer = questionnaireAnswers?.[question.id];
        const selectedOption = question.options?.find((option) => option.value === rawAnswer);
        const answerLabel = selectedOption?.label || rawAnswer || 'não informado';
        return `- ${question.label}: ${answerLabel}`;
      })
      .join('\n');
  };

  const estimateActivityFactor = () => {
    if (!useQuestionnaire) return 1.5;

    const activity = questionnaireAnswers.activity_level;
    if (activity === 'sedentary') return 1.2;
    if (activity === 'light') return 1.35;
    if (activity === 'moderate') return 1.5;
    if (activity === 'intense') return 1.7;

    const trainingDays = questionnaireAnswers.training_days || questionnaireAnswers.strength_training_days;
    if (trainingDays === '0-1') return 1.25;
    if (trainingDays === '2-3') return 1.45;
    if (trainingDays === '4-5') return 1.6;
    if (trainingDays === '6-7' || trainingDays === '6+') return 1.75;

    return 1.5;
  };

  const generateMealPlan = async () => {
    if (!profile) {
      toast({
        title: 'Complete seu perfil',
        description: 'Preencha idade, peso, altura e objetivo para gerar refeições com IA.',
        variant: 'destructive'
      });
      return;
    }

    if (useQuestionnaire && questionnaire.length > 0) {
      const questionnaireIncomplete = questionnaire.some(
        (question) => question.type === 'select' && !questionnaireAnswers?.[question.id]
      );
      if (questionnaireIncomplete) {
        toast({
          title: 'Questionário incompleto',
          description: 'Preencha as respostas antes de gerar o plano.',
          variant: 'destructive'
        });
        return;
      }
    }

    setGenerating(true);

    try {
      const user = await appClient.auth.me();

      // Calculate BMR and calories
      const safeWeight = Number(profile.weight) || 70;
      const safeHeight = Number(profile.height) || 170;
      const safeAge = Number(profile.age) || 30;
      const bmr = profile.gender === 'male'
        ? 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge + 5
        : 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge - 161;

      let targetCalories = Math.round(bmr * estimateActivityFactor());
      if (profile.goal === 'weight_loss') targetCalories -= 500;
      if (profile.goal === 'weight_gain') targetCalories += 500;
      if (profile.goal === 'muscle_gain') targetCalories += 300;
      if (!Number.isFinite(targetCalories) || targetCalories <= 0) {
        targetCalories = 2000;
      }

      const questionnaireContext = buildQuestionnaireContext();

      // Use AI to generate meal plan
      const prompt = `
Crie um plano alimentar semanal (7 dias) para:
- Idade: ${safeAge} anos
- Peso: ${safeWeight} kg
- Altura: ${safeHeight} cm
- Objetivo: ${goalLabel}
- Calorias diárias: ${targetCalories} kcal
- Restrições: ${restrictions || 'nenhuma'}
- Geração com questionário: ${useQuestionnaire ? 'sim' : 'não'}

Questionário personalizado (${goalLabel}):
${questionnaireContext}

Para cada dia, forneça 4 refeições (café da manhã, almoço, jantar, lanche) com:
- Nome do prato
- Lista de ingredientes
- Modo de preparo detalhado
- Valores nutricionais (calorias, proteínas, carboidratos, gorduras)
- Tempo de preparo

Se houver questionário, priorize essas respostas para personalizar o cardápio.
Use ingredientes brasileiros comuns e versões praticas para rotina real.
`;

      const response = await appClient.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            plan_title: { type: "string" },
            days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  meals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        meal_type: { type: "string" },
                        name: { type: "string" },
                        ingredients: {
                          type: "array",
                          items: { type: "string" }
                        },
                        recipe: { type: "string" },
                        calories: { type: "number" },
                        protein_g: { type: "number" },
                        carbs_g: { type: "number" },
                        fat_g: { type: "number" },
                        prep_time_minutes: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!response || typeof response !== 'object') {
        throw new Error('Resposta inválida da IA.');
      }

      const generatedDays = Array.isArray(response.days) ? response.days : [];
      if (generatedDays.length === 0) {
        throw new Error('A IA não retornou um plano de refeições válido.');
      }

      // Create meal plan
      const mealPlan = await appClient.entities.MealPlan.create({
        user_id: user.email,
        title: response.plan_title || 'Plano Semanal Personalizado',
        duration_days: 7,
        total_calories_per_day: targetCalories,
        dietary_restrictions: restrictions ? restrictions.split(',').map(r => r.trim()) : [],
        goal: profile.goal,
        questionnaire_enabled: useQuestionnaire,
        questionnaire_answers: useQuestionnaire ? questionnaireAnswers : {},
        start_date: new Date().toISOString().split('T')[0],
        is_active: true
      });

      // Create meals
      const mealPromises = generatedDays.flatMap(day =>
        (Array.isArray(day.meals) ? day.meals : []).map(meal =>
          appClient.entities.Meal.create({
            meal_plan_id: mealPlan.id,
            day_number: day.day || 1,
            meal_type: meal.meal_type || 'lunch',
            name: meal.name || 'Refeição sugerida',
            recipe: meal.recipe || 'Sem modo de preparo informado.',
            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
            calories: meal.calories || 0,
            protein_g: meal.protein_g || 0,
            carbs_g: meal.carbs_g || 0,
            fat_g: meal.fat_g || 0,
            prep_time_minutes: meal.prep_time_minutes || 30
          })
        )
      );

      await Promise.all(mealPromises);

      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      setShowGenerator(false);
      setRestrictions('');
      setUseQuestionnaire(false);
      setSelectedPlan(mealPlan);
      toast({
        title: 'Plano gerado',
        description: 'Seu plano semanal de refeições foi criado com sucesso.'
      });
    } catch (error) {
      console.error('Error generating meal plan:', error);
      toast({
        title: 'Falha ao gerar refeições',
        description: error?.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const dayMeals = meals.filter(m => m.day_number === selectedDay);
  const mealTypeOrder = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 };
  const sortedDayMeals = dayMeals.sort((a, b) => mealTypeOrder[a.meal_type] - mealTypeOrder[b.meal_type]);

  const mealTypeLabels = {
    breakfast: 'Caf\u00e9 da Manh\u00e3',
    lunch: 'Almo\u00e7o',
    dinner: 'Jantar',
    snack: 'Lanche'
  };

  return (
    <div className="app-shell bg-gradient-to-b from-slate-50 to-[#f4f7f8]">
      {/* Header */}
      <div className="module-header">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Utensils size={32} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Planos de Refeições</h1>
                  <p className="text-orange-100">Cardápios personalizados com IA</p>
                </div>
              </div>

              <Button
                onClick={() => setShowGenerator(true)}
                className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-sm h-11 px-5"
              >
                <motion.span
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="mr-2 inline-flex"
                >
                  <Sparkles size={18} />
                </motion.span>
                Gerar Plano
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {mealPlans.length === 0 ? (
          <div className="empty-state text-center py-20 px-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Utensils className="text-emerald-700" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Nenhum plano de refeições ainda
            </h3>
            <p className="text-gray-500 mb-1">
              Planos personalizados com base nas suas metas.
            </p>
            <p className="text-gray-500 mb-6">
              Gere agora e comece sua semana alimentar com direção.
            </p>
            <Button
              onClick={() => setShowGenerator(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-12 px-6"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mr-2 inline-flex"
              >
                <Sparkles size={18} />
              </motion.span>
              Gerar meu primeiro plano
            </Button>
          </div>
        ) : selectedPlan ? (
          <div className="space-y-6">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => setSelectedPlan(null)}
              className="mb-4"
            >
                Voltar aos planos
            </Button>

            {/* Plan Header */}
            <div className="surface-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedPlan.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>{selectedPlan.duration_days} dias</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame size={16} />
                      <span>{selectedPlan.total_calories_per_day} kcal/dia</span>
                    </div>
                  </div>
                </div>
                {selectedPlan.is_active && (
                  <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                )}
              </div>

              {selectedPlan.dietary_restrictions?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedPlan.dietary_restrictions.map((rest, idx) => (
                    <Badge key={idx} variant="outline">{rest}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Day Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: selectedPlan.duration_days }).map((_, idx) => {
                const day = idx + 1;
                return (
                  <motion.button
                    key={day}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDay(day)}
                    className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
                      selectedDay === day
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-400'
                    }`}
                  >
                    Dia {day}
                  </motion.button>
                );
              })}
            </div>

            {/* Meals */}
            <div className="space-y-4">
              {sortedDayMeals.map((meal, idx) => (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="surface-card overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">
                            {mealTypeLabels[meal.meal_type] || 'Refeição'}
                          </h3>
                        </div>
                        <h4 className="text-xl font-semibold text-emerald-700 mb-2">{meal.name}</h4>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-emerald-700 font-bold mb-1">
                          <Flame size={18} />
                          <span>{meal.calories} kcal</span>
                        </div>
                        {meal.prep_time_minutes && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock size={14} />
                            <span>{meal.prep_time_minutes} min</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Macros */}
                    <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-500 mb-1">Proteínas</p>
                        <p className="font-bold text-blue-600">{meal.protein_g}g</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-500 mb-1">Carboidratos</p>
                        <p className="font-bold text-amber-600">{meal.carbs_g}g</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-500 mb-1">Gorduras</p>
                        <p className="font-bold text-orange-600">{meal.fat_g}g</p>
                      </div>
                    </div>

                    {/* Ingredients */}
                    <div className="mb-4">
                      <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <Apple size={16} />
                        Ingredientes
                      </h5>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {meal.ingredients?.map((ing, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-green-500" />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recipe */}
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-2">Modo de Preparo</h5>
                      <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                        {meal.recipe}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mealPlans.map((plan, idx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedPlan(plan)}
                className="surface-card hover:shadow-md transition-all cursor-pointer overflow-hidden"
              >
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.title}</h3>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>{plan.duration_days} dias</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame size={16} />
                      <span>{plan.total_calories_per_day} kcal</span>
                    </div>
                  </div>

                  {plan.dietary_restrictions?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {plan.dietary_restrictions.slice(0, 2).map((rest, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{rest}</Badge>
                      ))}
                      {plan.dietary_restrictions.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{plan.dietary_restrictions.length - 2}</Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">
                      {new Date(plan.created_date).toLocaleDateString('pt-BR')}
                    </span>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      Ver Plano
                      <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Generator Dialog */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="text-orange-500" />
              Gerar Plano Personalizado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-sm text-orange-800">
                <strong>Nossa IA criará um plano alimentar</strong> baseado no seu perfil, objetivos e restrições alimentares.
              </p>
            </div>

            {profile && (
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <strong>Seu perfil:</strong>
                </p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Idade: {profile.age} anos</li>
                  <li>• Peso: {profile.weight} kg</li>
                  <li>• Altura: {profile.height} cm</li>
                  <li>• Objetivo: {goalLabel}</li>
                </ul>
              </div>
            )}

            {!profile && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Complete seu perfil (idade, peso, altura e objetivo) para habilitar a geração com IA.
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Restrições Alimentares (opcional)
              </label>
              <Input
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                placeholder="Ex: vegetariano, sem glúten, sem lactose"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separe múltiplas restrições por vírgula
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Como deseja gerar o plano?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUseQuestionnaire(false)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    !useQuestionnaire
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Geração rápida
                </button>
                <button
                  type="button"
                  onClick={() => setUseQuestionnaire(true)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    useQuestionnaire
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Responder questionário
                </button>
              </div>
            </div>

            {useQuestionnaire && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3 space-y-3">
                <p className="text-sm font-semibold text-orange-800">
                  Questionário para {goalLabel}
                </p>
                {questionnaire.map((question) => (
                  <div key={question.id} className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 block">{question.label}</label>
                    {question.type === 'select' ? (
                      <select
                        value={questionnaireAnswers?.[question.id] || ''}
                        onChange={(event) =>
                          setQuestionnaireAnswers((prev) => ({
                            ...prev,
                            [question.id]: event.target.value
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      >
                        {question.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={questionnaireAnswers?.[question.id] || ''}
                        onChange={(event) =>
                          setQuestionnaireAnswers((prev) => ({
                            ...prev,
                            [question.id]: event.target.value
                          }))
                        }
                        placeholder={question.placeholder || ''}
                        className="w-full bg-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={generateMealPlan}
              disabled={generating}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-12"
            >
              {generating ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Gerando plano...
                </>
              ) : (
                <>
                  <Sparkles size={18} className="mr-2" />
                  Gerar Plano (7 dias)
                </>
              )}
            </Button>

            {generating && (
              <p className="text-xs text-center text-gray-500">
                Isso pode levar até 30 segundos...
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

