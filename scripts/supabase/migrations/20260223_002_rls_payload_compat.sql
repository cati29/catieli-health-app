-- 20260223_002_rls_payload_compat.sql
-- Compatibilidade adicional de ownership para payloads de chat/notificacao.

CREATE OR REPLACE FUNCTION public.can_read_payload(input_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_key text;
BEGIN
  user_key := public.request_user_key();
  IF user_key IS NULL THEN
    RETURN FALSE;
  END IF;

  IF input_payload ? 'user_id' AND COALESCE(input_payload ->> 'user_id', '') = user_key THEN
    RETURN TRUE;
  END IF;

  IF input_payload ? 'created_by' AND COALESCE(input_payload ->> 'created_by', '') = user_key THEN
    RETURN TRUE;
  END IF;

  IF input_payload ? 'nutritionist_id' AND COALESCE(input_payload ->> 'nutritionist_id', '') = user_key THEN
    RETURN TRUE;
  END IF;

  IF input_payload ? 'patient_id' AND COALESCE(input_payload ->> 'patient_id', '') = user_key THEN
    RETURN TRUE;
  END IF;

  IF input_payload ? 'sender_id' AND COALESCE(input_payload ->> 'sender_id', '') = user_key THEN
    RETURN TRUE;
  END IF;

  IF input_payload ? 'receiver_id' AND COALESCE(input_payload ->> 'receiver_id', '') = user_key THEN
    RETURN TRUE;
  END IF;

  IF NOT (
    input_payload ? 'user_id'
    OR input_payload ? 'created_by'
    OR input_payload ? 'nutritionist_id'
    OR input_payload ? 'patient_id'
    OR input_payload ? 'sender_id'
    OR input_payload ? 'receiver_id'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_payload(input_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_key text;
BEGIN
  user_key := public.request_user_key();
  IF user_key IS NULL THEN
    RETURN FALSE;
  END IF;

  IF input_payload ? 'user_id' AND COALESCE(input_payload ->> 'user_id', '') <> '' THEN
    RETURN input_payload ->> 'user_id' = user_key;
  END IF;

  IF input_payload ? 'created_by' AND COALESCE(input_payload ->> 'created_by', '') <> '' THEN
    RETURN input_payload ->> 'created_by' = user_key;
  END IF;

  IF input_payload ? 'sender_id' AND COALESCE(input_payload ->> 'sender_id', '') <> '' THEN
    RETURN input_payload ->> 'sender_id' = user_key;
  END IF;

  IF input_payload ? 'nutritionist_id' AND COALESCE(input_payload ->> 'nutritionist_id', '') <> '' THEN
    RETURN input_payload ->> 'nutritionist_id' = user_key;
  END IF;

  IF input_payload ? 'patient_id' AND COALESCE(input_payload ->> 'patient_id', '') <> '' THEN
    RETURN input_payload ->> 'patient_id' = user_key;
  END IF;

  RETURN FALSE;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I ((payload->>''sender_id'')) WHERE payload ? ''sender_id''',
      'idx_' || tbl || '_payload_sender_id',
      tbl
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I ((payload->>''receiver_id'')) WHERE payload ? ''receiver_id''',
      'idx_' || tbl || '_payload_receiver_id',
      tbl
    );
  END LOOP;
END $$;
