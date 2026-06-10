import { z } from 'zod';

export const UserProfileSchema = z.object({
  user_id: z.string(),
  created_by: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  user_type: z.enum(['user', 'nutritionist'])
}).passthrough();

export const DailyGoalSchema = z.object({
  user_id: z.string(),
  date: z.string(),
  water_goal_ml: z.number().optional(),
  water_consumed_ml: z.number().optional(),
  calorie_goal: z.number().optional(),
  exercise_minutes_goal: z.number().optional(),
  exercise_minutes_done: z.number().optional()
}).passthrough();

export const WorkoutSessionSchema = z.object({
  user_id: z.string(),
  date: z.string(),
  routine_id: z.string().optional(),
  duration_minutes: z.number().optional()
}).passthrough();

export const DailyNutritionSchema = z.object({
  user_id: z.string(),
  date: z.string(),
  calories: z.number().optional(),
  protein_g: z.number().optional(),
  carbs_g: z.number().optional(),
  fat_g: z.number().optional()
}).passthrough();

export const ConversationSchema = z.object({
  user_id: z.string(),
  nutritionist_id: z.string(),
  status: z.enum(['pending', 'accepted', 'closed']).optional()
}).passthrough();

export const ChatMessageSchema = z.object({
  conversation_id: z.string(),
  sender_id: z.string(),
  receiver_id: z.string(),
  message: z.string()
}).passthrough();

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type DailyGoal = z.infer<typeof DailyGoalSchema>;
export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>;
export type DailyNutrition = z.infer<typeof DailyNutritionSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
