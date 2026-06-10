-- 20260224_004_relational_links.sql
-- Cria camada relacional (FKs) sem remover o padrao generico com payload jsonb.
-- Estrategia:
-- - adicionar colunas STORED GENERATED derivadas de payload->>'..._id'
-- - criar indices nessas colunas
-- - criar FKs (NOT VALID para nao bloquear em bases legadas)

-- chat_message -> conversation
ALTER TABLE public.chat_message
  ADD COLUMN IF NOT EXISTS conversation_ref text
  GENERATED ALWAYS AS (nullif(payload->>'conversation_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_chat_message_conversation_ref ON public.chat_message (conversation_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_chatmsg_conversation_ref'
      AND conrelid = 'public.chat_message'::regclass
  ) THEN
    ALTER TABLE public.chat_message
      ADD CONSTRAINT fk_chatmsg_conversation_ref
      FOREIGN KEY (conversation_ref)
      REFERENCES public.conversation (id)
      NOT VALID;
  END IF;
END $$;

-- meal -> meal_plan
ALTER TABLE public.meal
  ADD COLUMN IF NOT EXISTS meal_plan_ref text
  GENERATED ALWAYS AS (nullif(payload->>'meal_plan_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_meal_meal_plan_ref ON public.meal (meal_plan_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_meal_mealplan_ref'
      AND conrelid = 'public.meal'::regclass
  ) THEN
    ALTER TABLE public.meal
      ADD CONSTRAINT fk_meal_mealplan_ref
      FOREIGN KEY (meal_plan_ref)
      REFERENCES public.meal_plan (id)
      NOT VALID;
  END IF;
END $$;

-- group_member -> group
ALTER TABLE public.group_member
  ADD COLUMN IF NOT EXISTS group_ref text
  GENERATED ALWAYS AS (nullif(payload->>'group_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_group_member_group_ref ON public.group_member (group_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_groupmember_group_ref'
      AND conrelid = 'public.group_member'::regclass
  ) THEN
    ALTER TABLE public.group_member
      ADD CONSTRAINT fk_groupmember_group_ref
      FOREIGN KEY (group_ref)
      REFERENCES public."group" (id)
      NOT VALID;
  END IF;
END $$;

-- group_challenge -> group
ALTER TABLE public.group_challenge
  ADD COLUMN IF NOT EXISTS group_ref text
  GENERATED ALWAYS AS (nullif(payload->>'group_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_group_challenge_group_ref ON public.group_challenge (group_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_groupchallenge_group_ref'
      AND conrelid = 'public.group_challenge'::regclass
  ) THEN
    ALTER TABLE public.group_challenge
      ADD CONSTRAINT fk_groupchallenge_group_ref
      FOREIGN KEY (group_ref)
      REFERENCES public."group" (id)
      NOT VALID;
  END IF;
END $$;

-- group_challenge -> challenge
ALTER TABLE public.group_challenge
  ADD COLUMN IF NOT EXISTS challenge_ref text
  GENERATED ALWAYS AS (nullif(payload->>'challenge_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_group_challenge_challenge_ref ON public.group_challenge (challenge_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_groupchallenge_challenge_ref'
      AND conrelid = 'public.group_challenge'::regclass
  ) THEN
    ALTER TABLE public.group_challenge
      ADD CONSTRAINT fk_groupchallenge_challenge_ref
      FOREIGN KEY (challenge_ref)
      REFERENCES public.challenge (id)
      NOT VALID;
  END IF;
END $$;

-- post -> group
ALTER TABLE public.post
  ADD COLUMN IF NOT EXISTS group_ref text
  GENERATED ALWAYS AS (nullif(payload->>'group_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_post_group_ref ON public.post (group_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_post_group_ref'
      AND conrelid = 'public.post'::regclass
  ) THEN
    ALTER TABLE public.post
      ADD CONSTRAINT fk_post_group_ref
      FOREIGN KEY (group_ref)
      REFERENCES public."group" (id)
      NOT VALID;
  END IF;
END $$;

-- user_badge -> badge
ALTER TABLE public.user_badge
  ADD COLUMN IF NOT EXISTS badge_ref text
  GENERATED ALWAYS AS (nullif(payload->>'badge_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_user_badge_badge_ref ON public.user_badge (badge_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_userbadge_badge_ref'
      AND conrelid = 'public.user_badge'::regclass
  ) THEN
    ALTER TABLE public.user_badge
      ADD CONSTRAINT fk_userbadge_badge_ref
      FOREIGN KEY (badge_ref)
      REFERENCES public.badge (id)
      NOT VALID;
  END IF;
END $$;

-- user_challenge -> challenge
ALTER TABLE public.user_challenge
  ADD COLUMN IF NOT EXISTS challenge_ref text
  GENERATED ALWAYS AS (nullif(payload->>'challenge_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_user_challenge_ref ON public.user_challenge (challenge_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_userchallenge_challenge_ref'
      AND conrelid = 'public.user_challenge'::regclass
  ) THEN
    ALTER TABLE public.user_challenge
      ADD CONSTRAINT fk_userchallenge_challenge_ref
      FOREIGN KEY (challenge_ref)
      REFERENCES public.challenge (id)
      NOT VALID;
  END IF;
END $$;

-- exercise_log -> exercise
ALTER TABLE public.exercise_log
  ADD COLUMN IF NOT EXISTS exercise_ref text
  GENERATED ALWAYS AS (nullif(payload->>'exercise_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_exercise_log_ref ON public.exercise_log (exercise_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_exerciselog_exercise_ref'
      AND conrelid = 'public.exercise_log'::regclass
  ) THEN
    ALTER TABLE public.exercise_log
      ADD CONSTRAINT fk_exerciselog_exercise_ref
      FOREIGN KEY (exercise_ref)
      REFERENCES public.exercise (id)
      NOT VALID;
  END IF;
END $$;

-- food_entry -> food_database
ALTER TABLE public.food_entry
  ADD COLUMN IF NOT EXISTS food_ref text
  GENERATED ALWAYS AS (nullif(payload->>'food_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_food_entry_ref ON public.food_entry (food_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_foodentry_food_ref'
      AND conrelid = 'public.food_entry'::regclass
  ) THEN
    ALTER TABLE public.food_entry
      ADD CONSTRAINT fk_foodentry_food_ref
      FOREIGN KEY (food_ref)
      REFERENCES public.food_database (id)
      NOT VALID;
  END IF;
END $$;

-- workout_session -> workout_routine
ALTER TABLE public.workout_session
  ADD COLUMN IF NOT EXISTS routine_ref text
  GENERATED ALWAYS AS (nullif(payload->>'routine_id', '')) STORED;
CREATE INDEX IF NOT EXISTS idx_workout_session_routine_ref ON public.workout_session (routine_ref);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_workoutsession_routine_ref'
      AND conrelid = 'public.workout_session'::regclass
  ) THEN
    ALTER TABLE public.workout_session
      ADD CONSTRAINT fk_workoutsession_routine_ref
      FOREIGN KEY (routine_ref)
      REFERENCES public.workout_routine (id)
      NOT VALID;
  END IF;
END $$;


