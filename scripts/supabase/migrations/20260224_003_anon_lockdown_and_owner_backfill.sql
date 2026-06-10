-- 20260224_003_anon_lockdown_and_owner_backfill.sql
-- Objetivos:
-- 1) Endurecer acesso anonimo (defense-in-depth)
-- 2) Backfill de ownership para linhas legacy sem owner no payload
-- 3) Garantir unicidade pratica de daily_goal sem apagar dados legacy de demo

-- 1) Anon nao precisa CRUD nas tabelas de dominio.
REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon;

-- 2) Backfill seguro para rows sem ownership explicito.
-- Usamos um owner sentinela para fechar vazamento de leitura global em RLS
-- sem remover ou recriar dados antigos.
DO $$
DECLARE
  sentinel text := 'legacy_unassigned';
BEGIN
  UPDATE public.app_logs
  SET payload = jsonb_set(
    jsonb_set(payload, '{user_id}', to_jsonb(sentinel), true),
    '{created_by}', to_jsonb(sentinel), true
  )
  WHERE NOT (
    coalesce(payload->>'user_id', '') <> ''
    OR coalesce(payload->>'created_by', '') <> ''
    OR coalesce(payload->>'nutritionist_id', '') <> ''
    OR coalesce(payload->>'patient_id', '') <> ''
    OR coalesce(payload->>'sender_id', '') <> ''
    OR coalesce(payload->>'receiver_id', '') <> ''
  );

  UPDATE public.user_profile
  SET payload = jsonb_set(
    jsonb_set(payload, '{user_id}', to_jsonb(sentinel), true),
    '{created_by}', to_jsonb(sentinel), true
  )
  WHERE NOT (
    coalesce(payload->>'user_id', '') <> ''
    OR coalesce(payload->>'created_by', '') <> ''
    OR coalesce(payload->>'nutritionist_id', '') <> ''
    OR coalesce(payload->>'patient_id', '') <> ''
    OR coalesce(payload->>'sender_id', '') <> ''
    OR coalesce(payload->>'receiver_id', '') <> ''
  );
END $$;

-- 3) Indice unico de meta diaria ignorando registros legacy de demo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.daily_goal
    WHERE coalesce(payload->>'user_id', payload->>'created_by') <> 'demo@health-app.local'
    GROUP BY coalesce(payload->>'user_id', payload->>'created_by'), payload->>'date'
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS ux_daily_goal_owner_date_no_demo
      ON public.daily_goal (
        (coalesce(payload->>'user_id', payload->>'created_by')),
        (payload->>'date')
      )
      WHERE coalesce(payload->>'user_id', payload->>'created_by') <> 'demo@health-app.local';
  END IF;
END $$;
