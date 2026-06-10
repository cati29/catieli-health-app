-- 20260223_001_hardening.sql
-- Hardening para tabelas genéricas (id, payload, created_date, updated_date)
-- Regras:
-- - Não remove tabelas/colunas
-- - Mantém compatibilidade com payload atual (email em user_id/created_by)
-- - Ativa RLS + políticas para authenticated

-- 1) Privilégios: remover permissões perigosas e padronizar grants mínimos
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- 2) Helpers para RLS compatível com dados antigos (email) e novos (uid)
CREATE OR REPLACE FUNCTION public.request_user_key()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(auth.jwt() ->> 'email', ''), auth.uid()::text);
$$;

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

  -- Dono primário
  IF input_payload ? 'user_id' AND COALESCE(input_payload ->> 'user_id', '') <> '' THEN
    IF input_payload ->> 'user_id' = user_key THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Legado do projeto (created_by com email)
  IF input_payload ? 'created_by' AND COALESCE(input_payload ->> 'created_by', '') <> '' THEN
    IF input_payload ->> 'created_by' = user_key THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Conversas/relacionamentos entre dois usuários
  IF input_payload ? 'nutritionist_id' AND COALESCE(input_payload ->> 'nutritionist_id', '') = user_key THEN
    RETURN TRUE;
  END IF;
  IF input_payload ? 'patient_id' AND COALESCE(input_payload ->> 'patient_id', '') = user_key THEN
    RETURN TRUE;
  END IF;

  -- Tabelas globais sem owner no payload: leitura liberada para authenticated
  IF NOT (
    input_payload ? 'user_id'
    OR input_payload ? 'created_by'
    OR input_payload ? 'nutritionist_id'
    OR input_payload ? 'patient_id'
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

  IF input_payload ? 'nutritionist_id' AND COALESCE(input_payload ->> 'nutritionist_id', '') <> '' THEN
    RETURN input_payload ->> 'nutritionist_id' = user_key;
  END IF;

  IF input_payload ? 'patient_id' AND COALESCE(input_payload ->> 'patient_id', '') <> '' THEN
    RETURN input_payload ->> 'patient_id' = user_key;
  END IF;

  -- Sem campo de ownership => escrita bloqueada para authenticated
  RETURN FALSE;
END;
$$;

-- 3) Ativar RLS + políticas padrão em todas as tabelas do schema public
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
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS p_select_self ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS p_insert_self ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS p_update_self ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS p_delete_self ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS p_anon_none ON public.%I', tbl);

    EXECUTE format(
      'CREATE POLICY p_select_self ON public.%I FOR SELECT TO authenticated USING (public.can_read_payload(payload))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY p_insert_self ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_payload(payload))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY p_update_self ON public.%I FOR UPDATE TO authenticated USING (public.can_write_payload(payload)) WITH CHECK (public.can_write_payload(payload))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY p_delete_self ON public.%I FOR DELETE TO authenticated USING (public.can_write_payload(payload))',
      tbl
    );

    -- Anon explicitamente bloqueado (public key sem sessão)
    EXECUTE format(
      'CREATE POLICY p_anon_none ON public.%I FOR ALL TO anon USING (FALSE) WITH CHECK (FALSE)',
      tbl
    );
  END LOOP;
END $$;

-- 4) Índices estratégicos em JSONB (com filtro parcial para reduzir custo)
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
      'CREATE INDEX IF NOT EXISTS %I ON public.%I ((payload->>''user_id'')) WHERE payload ? ''user_id''',
      'idx_' || tbl || '_payload_user_id',
      tbl
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I ((payload->>''created_by'')) WHERE payload ? ''created_by''',
      'idx_' || tbl || '_payload_created_by',
      tbl
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I ((payload->>''date'')) WHERE payload ? ''date''',
      'idx_' || tbl || '_payload_date',
      tbl
    );
  END LOOP;
END $$;

-- 5) Unique indexes opcionais (somente se não houver duplicidade)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM daily_goal
    GROUP BY COALESCE(payload->>'user_id', payload->>'created_by'), payload->>'date'
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS ux_daily_goal_owner_date
      ON daily_goal ((COALESCE(payload->>'user_id', payload->>'created_by')), (payload->>'date'));
  ELSE
    RAISE NOTICE 'ux_daily_goal_owner_date não criado: há duplicidade em daily_goal';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM daily_nutrition
    GROUP BY COALESCE(payload->>'user_id', payload->>'created_by'), payload->>'date'
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS ux_daily_nutrition_owner_date
      ON daily_nutrition ((COALESCE(payload->>'user_id', payload->>'created_by')), (payload->>'date'));
  ELSE
    RAISE NOTICE 'ux_daily_nutrition_owner_date não criado: há duplicidade em daily_nutrition';
  END IF;
END $$;
