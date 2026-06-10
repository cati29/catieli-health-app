# Health App

Aplicação web de saúde e bem-estar com React + Vite + Supabase.

## Executar localmente

```bash
npm install
npm run dev
```

## Variaveis de ambiente

Configure em `.env.local`:

```bash
VITE_SUPABASE_URL=https://seu-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_DB_URL=postgresql://usuário:senha@host:porta/postgres
SUPABASE_PROJECT_REF=seu-ref

# LLM (treino e dieta)
# auto: usa openrouter se houver chave, senao deepseek, senao mock local
VITE_LLM_PROVIDER=auto

# opção grátis recomendada
VITE_OPENROUTER_API_KEY=sua-chave-openrouter
VITE_OPENROUTER_MODEL=openai/gpt-oss-20b:free

# opcional: DeepSeek direto (normalmente pago por uso)
# VITE_DEEPSEEK_API_KEY=sua-chave-deepseek
# VITE_DEEPSEEK_MODEL=deepseek-chat
```

Observações:
- A tela de treino com IA e o gerador de dieta usam `appClient.integrations.Core.InvokeLLM`.
- Para usar um modelo grátis da DeepSeek via OpenRouter, ajuste `VITE_OPENROUTER_MODEL` para um modelo `:free` disponível no OpenRouter.
- Em producao, evite expor chave de LLM no frontend; prefira proxy/edge function.
- Ao concluir cadastro de usuário comum, o app gera automaticamente exercícios personalizados com IA com base no perfil e objetivo.
- Ao gerar plano alimentar, o modal oferece modo rápido ou questionario por objetivo (emagrecimento, ganho de peso, saúde, ganho de massa, etc.) para personalizar o prompt.

## Espelhar dados reais (Realtime)

Para sair do modo local e espelhar dados reais entre dispositivos/usuários:

1. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente local e de deploy.
2. Provisione e endureca as tabelas:

```bash
npm run supabase:setup
npm run supabase:harden
```

3. No Supabase, habilite Realtime para as tabelas usadas pela aplicação (`Database > Replication`).
4. A aplicação já possui sincronizacao realtime global (`src/lib/RealtimeQuerySync.jsx`) e invalida cache automaticamente quando ocorrer `insert/update/delete`.

Sem as variaveis do Supabase, o app usa fallback local (`localStorage`) e não espelha dados entre sessões/dispositivos.

## Deploy online (Vercel/Netlify)

Checklist minimo:

1. Suba o repositorio no GitHub/GitLab.
2. Crie o projeto na Vercel (ou Netlify) apontando para este repositorio.
3. Defina variaveis de ambiente no painel de deploy:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_LLM_PROVIDER`
   - `VITE_OPENROUTER_API_KEY` e `VITE_OPENROUTER_MODEL` (ou as vars de DeepSeek)
4. Rode migrations/scripts de banco no ambiente alvo antes de liberar usuários.
5. Faça deploy e teste com 2 abas/dispositivos: ao salvar perfil/peso em um, o outro deve refletir automaticamente.

Recomendado para producao:
- mover chamadas de LLM para backend/edge function;
- rotacionar qualquer chave que tenha sido exposta no frontend.

## Provisionamento de tabelas

Cria automaticamente as tabelas detectadas no codigo (`appClient.entities.X`):

```bash
npm run supabase:setup
```

## Hardening de banco

Aplica todas as migrations SQL de `scripts/supabase/migrations`:

```bash
npm run supabase:harden
```

Esse processo:
- remove privilegios perigosos de `anon`/`authenticated`;
- ativa RLS em tabelas públicas;
- cria politicas padrao por ownership em `payload`;
- cria indices JSONB estrategicos;
- aplica ajustes de compatibilidade para chat (`sender_id`/`receiver_id`).

## Arquitetura aplicada

- `src/lib/supabaseClient.js`: cliente Supabase centralizado.
- `src/api/appClient.js`: gateway de persistencia com:
  - auth real via Supabase (sem usuário demo);
  - validacao Zod por entidade;
  - filtros server-side (`eq`, `gte`, `lte`, etc.);
  - controle otimista por `updated_date` em updates.
- `src/domain/schemas.js`: validacao de dominio.
- rotas adicionais criadas: `Login`, `RoutineBuilder`, `WorkoutHistory`, `RoutineDetail`.

## Build e qualidade

```bash
npm run build
```

`npm run lint` passa no estado atual. O comando `npx eslint .` ainda reporta apenas alguns warnings legados (sem erros).
