import { appClient } from '@/api/appClient';

const safeString = (value, fallback = '') => (typeof value === 'string' && value.trim() ? value.trim() : fallback);
const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function ownership({ targetEmail, nutritionistEmail }) {
  if (nutritionistEmail && nutritionistEmail !== targetEmail) {
    return {
      user_id: targetEmail,
      patient_id: targetEmail,
      nutritionist_id: nutritionistEmail,
      created_by: nutritionistEmail
    };
  }
  return {
    user_id: targetEmail,
    created_by: targetEmail
  };
}

function inferActivityFactor(profile) {
  const goal = profile?.goal;
  if (goal === 'muscle_gain') return 1.55;
  if (goal === 'weight_gain') return 1.5;
  if (goal === 'weight_loss') return 1.45;
  return 1.4;
}

function bmrFor(profile) {
  const weight = safeNumber(profile?.weight, 70);
  const height = safeNumber(profile?.height, 170);
  const age = safeNumber(profile?.age, 30);
  const isMale = profile?.gender === 'male';
  return isMale
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
}

function targetCalories(profile) {
  const base = bmrFor(profile) * inferActivityFactor(profile);
  let calories = Math.round(base);
  if (profile?.goal === 'weight_loss') calories -= 500;
  if (profile?.goal === 'weight_gain') calories += 500;
  if (profile?.goal === 'muscle_gain') calories += 300;
  if (!Number.isFinite(calories) || calories <= 1000) return 2000;
  return calories;
}

export const AssistedPlanGenerator = {
  async listExerciseCatalog() {
    try {
      const all = await appClient.entities.Exercise.list();
      return Array.isArray(all) ? all : [];
    } catch {
      return [];
    }
  },

  async generateWorkoutPlan({ targetProfile, targetEmail, nutritionistEmail, notes = '' }) {
    if (!targetProfile || !targetEmail) {
      throw new Error('Perfil ou email do paciente ausente.');
    }

    const exercises = await this.listExerciseCatalog();
    if (exercises.length === 0) {
      throw new Error('Catálogo de exercícios vazio. Cadastre exercícios antes de gerar treino.');
    }

    const goalLabel = {
      weight_loss: 'Perda de peso',
      muscle_gain: 'Ganho de massa muscular',
      weight_gain: 'Ganho de peso',
      health: 'Saúde geral'
    }[targetProfile?.goal] || 'Condicionamento físico';

    const prompt = `
Você é um personal trainer profissional criando um plano de treino semanal personalizado para um paciente.

PERFIL DO PACIENTE:
- Nome: ${safeString(targetProfile?.first_name, 'paciente')}
- Objetivo: ${goalLabel}
- Idade: ${safeNumber(targetProfile?.age, 30)} anos
- Peso: ${safeNumber(targetProfile?.weight, 70)} kg
- Altura: ${safeNumber(targetProfile?.height, 170)} cm
- Nível atual: ${safeNumber(targetProfile?.level, 1)}

OBSERVAÇÕES CLÍNICAS DA NUTRICIONISTA:
${notes || '(nenhuma)'}

EXERCÍCIOS DISPONÍVEIS:
${exercises.slice(0, 40).map((e) => `- ${e.name} (${e.category || 'geral'}, ${e.muscle_group || 'múltiplo'}, ${e.difficulty || 'médio'})`).join('\n')}

INSTRUÇÕES:
1. Crie de 3 a 5 rotinas para a semana (dias de treino)
2. Cada rotina com 5-8 exercícios da lista acima
3. Para cada exercício: séries, repetições, descanso (segundos) e nota de intensidade
4. Inclua dias de descanso conforme apropriado
5. Sequência progressiva ao longo da semana
`;

    let response;
    try {
      response = await appClient.integrations.Core.InvokeLLM({
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
                  focus_notes: { type: 'string' },
                  duration_minutes: { type: 'number' },
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
                  }
                }
              }
            }
          }
        }
      });
    } catch (llmError) {
      throw new Error(`Falha ao chamar a IA: ${llmError?.message || 'erro desconhecido'}`);
    }

    const rawRoutines = Array.isArray(response?.routines) ? response.routines : [];
    if (rawRoutines.length === 0) {
      throw new Error('A IA não retornou rotinas válidas. Tente novamente.');
    }

    const own = ownership({ targetEmail, nutritionistEmail });
    const planTitle = safeString(response?.weekly_plan?.title, 'Plano de Treino Personalizado');
    const planDescription = safeString(
      response?.weekly_plan?.description,
      nutritionistEmail ? `Plano gerado pela nutricionista ${nutritionistEmail} via IA.` : 'Plano gerado via IA.'
    );

    const created = [];
    for (const routine of rawRoutines) {
      const mappedExercises = (Array.isArray(routine.exercises) ? routine.exercises : []).map((ex) => {
        const exerciseName = safeString(ex?.exercise_name, 'Exercício');
        const found = exercises.find(
          (e) => String(e?.name || '').toLowerCase() === exerciseName.toLowerCase()
        );
        return {
          exercise_id: found?.id || '',
          exercise_name: exerciseName,
          name: exerciseName,
          muscle_group: found?.muscle_group || '',
          equipment: found?.equipment || '',
          sets: safeNumber(ex?.sets, 3),
          reps: safeNumber(ex?.reps, 12),
          rest_seconds: safeNumber(ex?.rest_seconds, 60),
          notes: safeString(ex?.intensity_note, '')
        };
      });

      const newRoutine = await appClient.entities.WorkoutRoutine.create({
        ...own,
        name: safeString(routine.name, 'Treino IA'),
        description: safeString(routine.description, planDescription),
        day_type: safeString(routine.day_type, 'treino'),
        focus_notes: safeString(routine.focus_notes, ''),
        duration_minutes: safeNumber(routine.duration_minutes, 45),
        days_per_week: rawRoutines.length,
        exercises: mappedExercises,
        is_active: true,
        created_by_ai: true,
        weekly_plan_title: planTitle,
        weekly_plan_notes: safeString(response?.weekly_plan?.recovery_notes, '')
      });
      created.push(newRoutine);
    }

    return { created, planTitle };
  },

  async generateMealPlan({ targetProfile, targetEmail, nutritionistEmail, restrictions = '', notes = '' }) {
    if (!targetProfile || !targetEmail) {
      throw new Error('Perfil ou email do paciente ausente.');
    }

    const goalLabel = {
      weight_loss: 'Emagrecimento',
      weight_gain: 'Ganho de peso',
      muscle_gain: 'Ganho de massa',
      health: 'Saúde'
    }[targetProfile?.goal] || 'Saúde';

    const calories = targetCalories(targetProfile);

    const prompt = `
Crie um plano alimentar semanal (7 dias) para um paciente.

PERFIL:
- Nome: ${safeString(targetProfile?.first_name, 'paciente')}
- Idade: ${safeNumber(targetProfile?.age, 30)} anos
- Peso: ${safeNumber(targetProfile?.weight, 70)} kg
- Altura: ${safeNumber(targetProfile?.height, 170)} cm
- Objetivo: ${goalLabel}
- Meta calórica estimada: ${calories} kcal/dia
- Restrições/alergias: ${restrictions || 'nenhuma'}

OBSERVAÇÕES DA NUTRICIONISTA:
${notes || '(nenhuma)'}

Para cada dia, forneça 4 refeições (café da manhã, almoço, jantar, lanche) com:
- Nome do prato
- Ingredientes brasileiros comuns
- Modo de preparo prático
- Valores nutricionais (calorias, proteínas, carboidratos, gorduras)
- Tempo de preparo em minutos
`;

    let response;
    try {
      response = await appClient.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            plan_title: { type: 'string' },
            days: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'number' },
                  meals: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        meal_type: { type: 'string' },
                        name: { type: 'string' },
                        ingredients: { type: 'array', items: { type: 'string' } },
                        recipe: { type: 'string' },
                        calories: { type: 'number' },
                        protein_g: { type: 'number' },
                        carbs_g: { type: 'number' },
                        fat_g: { type: 'number' },
                        prep_time_minutes: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    } catch (llmError) {
      throw new Error(`Falha ao chamar a IA: ${llmError?.message || 'erro desconhecido'}`);
    }

    const generatedDays = Array.isArray(response?.days) ? response.days : [];
    if (generatedDays.length === 0) {
      throw new Error('A IA não retornou refeições válidas.');
    }

    const own = ownership({ targetEmail, nutritionistEmail });
    const title = safeString(response?.plan_title, 'Plano Alimentar Personalizado');

    const mealPlan = await appClient.entities.MealPlan.create({
      ...own,
      title,
      duration_days: 7,
      total_calories_per_day: calories,
      dietary_restrictions: restrictions ? restrictions.split(',').map((r) => r.trim()).filter(Boolean) : [],
      goal: targetProfile?.goal || 'health',
      start_date: new Date().toISOString().split('T')[0],
      is_active: true,
      created_by_ai: true,
      assisted_notes: safeString(notes, '')
    });

    const mealOwn = ownership({ targetEmail, nutritionistEmail });
    const mealPromises = generatedDays.flatMap((day) => {
      const dayNumber = safeNumber(day?.day, 1);
      return (Array.isArray(day.meals) ? day.meals : []).map((meal) =>
        appClient.entities.Meal.create({
          ...mealOwn,
          meal_plan_id: mealPlan.id,
          day_number: dayNumber,
          meal_type: safeString(meal?.meal_type, 'lunch'),
          name: safeString(meal?.name, 'Refeição'),
          recipe: safeString(meal?.recipe, ''),
          ingredients: Array.isArray(meal?.ingredients) ? meal.ingredients : [],
          calories: safeNumber(meal?.calories, 0),
          protein_g: safeNumber(meal?.protein_g, 0),
          carbs_g: safeNumber(meal?.carbs_g, 0),
          fat_g: safeNumber(meal?.fat_g, 0),
          prep_time_minutes: safeNumber(meal?.prep_time_minutes, 30)
        })
      );
    });

    await Promise.all(mealPromises);

    return { mealPlan, title, daysCreated: generatedDays.length };
  },

  async listPatientWorkouts({ patientEmail, nutritionistEmail }) {
    const own = await appClient.entities.WorkoutRoutine.filter({
      user_id: patientEmail
    });
    if (!nutritionistEmail) return own;
    const assignedByMe = await appClient.entities.WorkoutRoutine.filter({
      patient_id: patientEmail,
      nutritionist_id: nutritionistEmail
    });
    const map = new Map();
    [...own, ...assignedByMe].forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  },

  async listPatientMealPlans({ patientEmail, nutritionistEmail }) {
    const own = await appClient.entities.MealPlan.filter({ user_id: patientEmail });
    if (!nutritionistEmail) return own;
    const assignedByMe = await appClient.entities.MealPlan.filter({
      patient_id: patientEmail,
      nutritionist_id: nutritionistEmail
    });
    const map = new Map();
    [...own, ...assignedByMe].forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }
};
