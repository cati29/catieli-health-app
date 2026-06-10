import { appClient } from '@/api/appClient';

const VALID_CATEGORIES = ['strength', 'cardio', 'flexibility', 'balance', 'hiit'];
const VALID_MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full_body'];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const normalizeText = (value, fallback = '') => String(value || fallback).trim();

const normalizeList = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const normalizeDifficulty = (value, level = 1) => {
  const normalized = String(value || '').toLowerCase();
  if (VALID_DIFFICULTIES.includes(normalized)) return normalized;
  if (level <= 2) return 'beginner';
  if (level <= 5) return 'intermediate';
  return 'advanced';
};

const normalizeCategory = (value, goal = 'health') => {
  const normalized = String(value || '').toLowerCase();
  if (VALID_CATEGORIES.includes(normalized)) return normalized;

  if (goal === 'weight_loss') return 'cardio';
  if (goal === 'muscle_gain') return 'strength';
  if (goal === 'weight_gain') return 'strength';
  return 'balance';
};

const normalizeMuscleGroup = (value, category = 'strength') => {
  const normalized = String(value || '').toLowerCase();
  if (VALID_MUSCLE_GROUPS.includes(normalized)) return normalized;

  if (category === 'cardio') return 'full_body';
  if (category === 'flexibility') return 'core';
  return 'legs';
};

const normalizeExercise = (exercise, profile, index) => {
  const category = normalizeCategory(exercise?.category, profile?.goal);
  const difficulty = normalizeDifficulty(exercise?.difficulty, profile?.level || 1);
  const muscleGroup = normalizeMuscleGroup(exercise?.muscle_group, category);
  const caloriesPerMinute = Number(exercise?.calories_per_minute);
  const safeCaloriesPerMinute = Number.isFinite(caloriesPerMinute)
    ? Math.max(3, Math.min(20, Math.round(caloriesPerMinute)))
    : 8;

  const name = normalizeText(exercise?.name, `Exercício personalizado ${index + 1}`);
  const description = normalizeText(
    exercise?.description,
    'Exercício personalizado com base no seu perfil e objetivo.'
  );

  const instructions = normalizeList(exercise?.instructions);
  const equipment = normalizeList(exercise?.equipment);

  return {
    name,
    description,
    category,
    muscle_group: muscleGroup,
    difficulty,
    equipment,
    instructions,
    calories_per_minute: safeCaloriesPerMinute
  };
};

const buildFallbackExercises = (profile) => {
  const goal = profile?.goal || 'health';
  const baseDifficulty = normalizeDifficulty('', profile?.level || 1);

  const templates = [
    {
      name: goal === 'weight_loss' ? 'Circuito de baixa impacto' : 'Circuito funcional',
      description: 'Treino de corpo inteiro com foco em resistência e técnica.',
      category: goal === 'weight_loss' ? 'cardio' : 'strength',
      muscle_group: 'full_body',
      instructions: [
        'Aqueça por 5 minutos com caminhada ou polichinelos leves.',
        'Faça 3 voltas do circuito com descanso de 60 segundos.',
        'Finalize com alongamento de quadris e ombros.'
      ],
      calories_per_minute: goal === 'weight_loss' ? 10 : 8
    },
    {
      name: 'Agachamento guiado',
      description: 'Fortalece pernas e gluteos com controle de postura.',
      category: 'strength',
      muscle_group: 'legs',
      instructions: [
        'Mantenha os pés na largura dos ombros.',
        'Desça até aproximadamente 90 graus do joelho.',
        'Suba contraindo gluteos e mantendo o tronco alinhado.'
      ],
      calories_per_minute: 7
    },
    {
      name: 'Prancha ativa',
      description: 'Estabilidade de core para melhorar postura e desempenho.',
      category: 'balance',
      muscle_group: 'core',
      instructions: [
        'Apoie antebracos e pontas dos pés no solo.',
        'Contraia abdomen e gluteos.',
        'Mantenha o corpo alinhado por 20 a 40 segundos.'
      ],
      calories_per_minute: 6
    },
    {
      name: 'Mobilidade de quadril e coluna',
      description: 'Sessão curta para reduzir rigidez e prevenir lesoes.',
      category: 'flexibility',
      muscle_group: 'full_body',
      instructions: [
        'Execute 8 repetições por lado em movimentos lentos.',
        'Respire profundamente durante cada posição.',
        'Não force amplitude com dor.'
      ],
      calories_per_minute: 4
    },
    {
      name: 'Corrida estacionária intervalada',
      description: 'Estimulo cardiovascular com blocos curtos de intensidade.',
      category: 'hiit',
      muscle_group: 'full_body',
      instructions: [
        'Alterne 30 segundos forte e 30 segundos leve.',
        'Repita por 10 a 15 minutos.',
        'Controle respiração e postura.'
      ],
      calories_per_minute: 12
    },
    {
      name: 'Remada com elástico',
      description: 'Fortalece costas e melhora estabilização escapular.',
      category: 'strength',
      muscle_group: 'back',
      instructions: [
        'Segure o elástico com pegada neutra.',
        'Puxe os cotovelos para tras sem elevar ombros.',
        'Retorne controlando a fase excêntrica.'
      ],
      equipment: ['elastico'],
      calories_per_minute: 7
    },
    {
      name: 'Flexao inclinada',
      description: 'Exercício de empurrar adaptado para desenvolvimento progressivo.',
      category: 'strength',
      muscle_group: 'chest',
      instructions: [
        'Apoie as mãos em banco ou parede.',
        'Desca o peito em direção ao apoio.',
        'Empurre até estender os bracos sem travar cotovelos.'
      ],
      calories_per_minute: 7
    },
    {
      name: 'Caminhada acelerada',
      description: 'Base cardiovascular segura para frequência diária.',
      category: 'cardio',
      muscle_group: 'legs',
      instructions: [
        'Mantenha ritmo sustentável por 20 a 40 minutos.',
        'Use bracos para ajudar na propulsao.',
        'Finalize com 3 minutos de desaquecimento.'
      ],
      calories_per_minute: 8
    }
  ];

  return templates.map((exercise, index) => ({
    ...exercise,
    difficulty: baseDifficulty,
    equipment: exercise.equipment || []
  }));
};

const dedupeByName = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeText(item?.name).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildPrompt = (profile) => `
Crie exercícios personalizados para o perfil abaixo.

Perfil:
- Objetivo: ${profile?.goal || 'health'}
- Idade: ${profile?.age || 'não informado'}
- Peso: ${profile?.weight || 'não informado'}
- Altura: ${profile?.height || 'não informado'}
- Nível: ${profile?.level || 1}

Instruções:
1. Gere 10 exercícios variados.
2. Misture forca, cardio e mobilidade de acordo com o objetivo.
3. Foque em seguranca e progressao para nível do usuário.
4. Descreva em portugues do Brasil.
5. Evite nomes duplicados.
`;

export const ensurePersonalizedExercisesForProfile = async (profile, userEmail) => {
  if (!profile || !userEmail || profile.user_type !== 'user') {
    return { created: 0, skipped: true, reason: 'invalid_profile' };
  }

  const existingPersonalized = await appClient.entities.Exercise.filter({
    personalized_for_user: userEmail
  });

  if (existingPersonalized.length >= 8) {
    return { created: 0, skipped: true, reason: 'already_generated' };
  }

  let aiExercises = [];

  try {
    const llmResponse = await appClient.integrations.Core.InvokeLLM({
      prompt: buildPrompt(profile),
      response_json_schema: {
        type: 'object',
        properties: {
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                muscle_group: { type: 'string' },
                difficulty: { type: 'string' },
                equipment: {
                  type: 'array',
                  items: { type: 'string' }
                },
                instructions: {
                  type: 'array',
                  items: { type: 'string' }
                },
                calories_per_minute: { type: 'number' }
              }
            }
          }
        }
      }
    });

    aiExercises = Array.isArray(llmResponse?.exercises) ? llmResponse.exercises : [];
  } catch {
    aiExercises = [];
  }

  const sourceExercises = aiExercises.length > 0 ? aiExercises : buildFallbackExercises(profile);
  const normalizedExercises = dedupeByName(
    sourceExercises.map((exercise, index) => normalizeExercise(exercise, profile, index))
  ).slice(0, 12);

  if (normalizedExercises.length === 0) {
    return { created: 0, skipped: true, reason: 'empty_result' };
  }

  const existingNames = new Set(
    existingPersonalized.map((exercise) => normalizeText(exercise?.name).toLowerCase()).filter(Boolean)
  );

  const toCreate = normalizedExercises.filter((exercise) => {
    const key = exercise.name.toLowerCase();
    if (existingNames.has(key)) return false;
    existingNames.add(key);
    return true;
  });

  if (toCreate.length === 0) {
    return { created: 0, skipped: true, reason: 'duplicates_only' };
  }

  await Promise.all(
    toCreate.map((exercise) =>
      appClient.entities.Exercise.create({
        ...exercise,
        ai_generated: true,
        personalized_for_user: userEmail,
        generated_from_profile: true,
        goal_reference: profile?.goal || 'health'
      })
    )
  );

  return { created: toCreate.length, skipped: false };
};

