-- 20260609_006_post_social_public.sql
-- Libera o feed social: posts viraveis por qualquer usuario autenticado,
-- curtidas/comentarios funcionam entre perfis (athlete, nutritionist, partner).
-- INSERT/DELETE continuam restritos ao autor.

-- Garante RLS habilitado (idempotente)
ALTER TABLE public.post ENABLE ROW LEVEL SECURITY;

-- Remove politicas genericas herdadas do hardening pra tabela `post`
DROP POLICY IF EXISTS p_select_self ON public.post;
DROP POLICY IF EXISTS p_insert_self ON public.post;
DROP POLICY IF EXISTS p_update_self ON public.post;
DROP POLICY IF EXISTS p_delete_self ON public.post;
DROP POLICY IF EXISTS p_anon_none ON public.post;

-- Remove politicas anteriores deste arquivo (idempotencia em re-deploys)
DROP POLICY IF EXISTS p_select_post_public ON public.post;
DROP POLICY IF EXISTS p_insert_post_self ON public.post;
DROP POLICY IF EXISTS p_update_post_engagement ON public.post;
DROP POLICY IF EXISTS p_delete_post_self ON public.post;
DROP POLICY IF EXISTS p_anon_none_post ON public.post;

-- SELECT publico: qualquer usuario autenticado le todos os posts do feed
CREATE POLICY p_select_post_public ON public.post
  FOR SELECT TO authenticated
  USING (TRUE);

-- INSERT: usuario so cria post em seu proprio nome (user_id = email do logado)
CREATE POLICY p_insert_post_self ON public.post
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_payload(payload));

-- UPDATE: qualquer autenticado pode atualizar (necessario para curtidas e
-- comentarios em posts de terceiros, ja que os arrays sao gravados no
-- proprio documento Post). Tradeoff aceito para o MVP do feed social.
CREATE POLICY p_update_post_engagement ON public.post
  FOR UPDATE TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- DELETE: apenas o autor pode remover seu post
CREATE POLICY p_delete_post_self ON public.post
  FOR DELETE TO authenticated
  USING (public.can_write_payload(payload));

-- Anon segue bloqueado
CREATE POLICY p_anon_none_post ON public.post
  FOR ALL TO anon
  USING (FALSE)
  WITH CHECK (FALSE);

-- Indices para ordenacao mais rapida do feed por data
CREATE INDEX IF NOT EXISTS idx_post_created_date ON public.post (created_date DESC);
CREATE INDEX IF NOT EXISTS idx_post_payload_type ON public.post ((payload->>'type')) WHERE payload ? 'type';
