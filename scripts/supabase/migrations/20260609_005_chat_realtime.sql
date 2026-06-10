-- Habilita realtime (postgres_changes) para as tabelas de chat.
-- Sem isso, as inscricoes do front-end em supabase.channel(...).on('postgres_changes', ...)
-- nao recebem eventos, e o chat depende apenas de polling (lento).
--
-- Como rodar:
--   1) Preencha SUPABASE_DB_PASSWORD em .env.local com a senha do banco
--      (Supabase Dashboard > Project Settings > Database > Reset database password).
--   2) Rode: npm run supabase:setup  (executa este e os demais .sql desta pasta)
--   OU rode manualmente no SQL Editor do Supabase.

-- Garante que a publicacao supabase_realtime existe (criada pelo Supabase por padrao).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  END IF;
END $$;

-- Adiciona as tabelas de chat a publicacao (idempotente).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'conversation' AND relkind = 'r')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND tablename = 'conversation'
     )
  THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'chat_message' AND relkind = 'r')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message'
     )
  THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notification' AND relkind = 'r')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND tablename = 'notification'
     )
  THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notification';
  END IF;
END $$;

-- REPLICA IDENTITY FULL: necessario para o Supabase Realtime enviar o registro
-- completo no evento (sem isso, UPDATEs vem so com a chave primaria).
ALTER TABLE IF EXISTS public.conversation REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_message REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.notification REPLICA IDENTITY FULL;
