import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const ownerFieldsSchema = z.object({
  user_id: z.string().min(1).optional(),
  created_by: z.string().min(1).optional(),
  nutritionist_id: z.string().min(1).optional(),
  patient_id: z.string().min(1).optional(),
  sender_id: z.string().min(1).optional(),
  receiver_id: z.string().min(1).optional()
});

const userProfileSchema = ownerFieldsSchema.extend({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  user_type: z.enum(['user', 'nutritionist']),
  age: z.number().int().positive().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  goal: z.string().optional(),
  xp: z.number().int().nonnegative().optional(),
  level: z.number().int().positive().optional(),
  plan_type: z.enum(['free', 'basic', 'premium']).optional()
}).passthrough();

const dailyGoalSchema = ownerFieldsSchema.extend({
  date: isoDate,
  water_goal_ml: z.number().nonnegative().optional(),
  water_consumed_ml: z.number().nonnegative().optional(),
  calorie_goal: z.number().nonnegative().optional(),
  exercise_minutes_goal: z.number().nonnegative().optional(),
  exercise_minutes_done: z.number().nonnegative().optional()
}).passthrough();

const dailyNutritionSchema = ownerFieldsSchema.extend({
  date: isoDate,
  calories: z.number().nonnegative().optional(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  fiber_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional()
}).passthrough();

const foodEntrySchema = ownerFieldsSchema.extend({
  date: isoDate,
  food_name: z.string().min(1),
  food_id: z.string().optional(),
  quantity_grams: z.number().positive(),
  meal_type: z.string().min(1),
  calories: z.number().nonnegative(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  fiber_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional()
}).passthrough();

const waterEntrySchema = ownerFieldsSchema.extend({
  date: isoDate,
  amount_ml: z.number().positive()
}).passthrough();

const healthDataSchema = ownerFieldsSchema.extend({
  date: isoDate
}).passthrough();

const workoutSessionSchema = ownerFieldsSchema.extend({
  date: isoDate,
  routine_id: z.string().optional(),
  duration_minutes: z.number().nonnegative().optional()
}).passthrough();

const exerciseLogSchema = ownerFieldsSchema.extend({
  date: isoDate,
  exercise_id: z.string().optional(),
  exercise_name: z.string().optional()
}).passthrough();

const conversationSchema = ownerFieldsSchema.extend({
  user_id: z.string().min(1),
  nutritionist_id: z.string().min(1),
  status: z.enum(['pending', 'accepted', 'closed']).optional()
}).passthrough();

const chatMessageSchema = ownerFieldsSchema.extend({
  conversation_id: z.string().min(1),
  sender_id: z.string().min(1),
  receiver_id: z.string().min(1),
  message: z.string().min(1)
}).passthrough();

const postSchema = ownerFieldsSchema.extend({
  content: z.string().min(1),
  type: z.string().optional()
}).passthrough();

const notificationSchema = ownerFieldsSchema.extend({
  title: z.string().min(1),
  message: z.string().min(1)
}).passthrough();

const mealPlanSchema = ownerFieldsSchema.extend({
  user_id: z.string().min(1),
  title: z.string().min(1)
}).passthrough();

const mealSchema = ownerFieldsSchema.extend({
  meal_plan_id: z.string().min(1),
  meal_type: z.string().min(1),
  name: z.string().min(1)
}).passthrough();

const workoutRoutineSchema = ownerFieldsSchema.extend({
  user_id: z.string().min(1),
  name: z.string().min(1)
}).passthrough();

const appLogsSchema = ownerFieldsSchema.extend({
  page_name: z.string().min(1),
  logged_at: z.string().optional()
}).passthrough();

export const ownerFieldNames = [
  'user_id',
  'created_by',
  'nutritionist_id',
  'patient_id',
  'sender_id',
  'receiver_id'
];

export const ownerlessWriteEntities = new Set([
  'Badge',
  'Challenge',
  'Exercise',
  'FoodDatabase',
  'AppUpdate'
]);

const entitySchemas = {
  UserProfile: userProfileSchema,
  DailyGoal: dailyGoalSchema,
  DailyNutrition: dailyNutritionSchema,
  FoodEntry: foodEntrySchema,
  WaterEntry: waterEntrySchema,
  HealthData: healthDataSchema,
  WorkoutSession: workoutSessionSchema,
  ExerciseLog: exerciseLogSchema,
  WorkoutRoutine: workoutRoutineSchema,
  Conversation: conversationSchema,
  ChatMessage: chatMessageSchema,
  Post: postSchema,
  Notification: notificationSchema,
  MealPlan: mealPlanSchema,
  Meal: mealSchema,
  AppLogs: appLogsSchema
};

const fallbackSchema = ownerFieldsSchema.passthrough();

const hasAnyOwnerField = (payload = {}) =>
  ownerFieldNames.some((field) => typeof payload[field] === 'string' && payload[field].trim() !== '');

export const ensureOwnershipPayload = (entityName, payload, userKey) => {
  if (ownerlessWriteEntities.has(entityName)) {
    return payload;
  }

  if (hasAnyOwnerField(payload)) {
    return payload;
  }

  if (!userKey) {
    throw new Error(`Ownership field required for entity ${entityName}`);
  }

  return {
    ...payload,
    user_id: userKey,
    created_by: userKey
  };
};

export const validateEntityPayload = (entityName, payload, { partial = false } = {}) => {
  const schema = entitySchemas[entityName] || fallbackSchema;
  const parser = partial ? schema.partial() : schema;
  return parser.parse(payload);
};
