# Documentação do Sistema — Health App (Catieli)

Aplicação web de saúde e bem-estar, baseada em **React + Vite + Supabase**, com gamificação, registro de hábitos e integração com IA para sugestões personalizadas.

---

## 1. Visão geral

O Health App permite que usuários acompanhem hábitos saudáveis (água, alimentação, exercícios), recebam recompensas por consistência e tenham acesso a profissionais (nutricionistas). A arquitetura é modular: o front-end consome serviços do **Supabase** (Auth, PostgREST e Storage) por meio de um *gateway* centralizado (`src/api/appClient.js`).

### Tecnologias principais

| Camada | Tecnologia |
|--------|-----------|
| Front-end | React 18, Vite 6, TailwindCSS, Radix UI |
| Estado/cache | TanStack Query (React Query) v5 |
| Roteamento | React Router DOM v6 |
| Autenticação | Supabase Auth (JWT) |
| Banco de dados | Supabase (PostgreSQL + PostgREST) |
| Armazenamento | Supabase Storage (bucket `health-app-uploads`) |
| IA | OpenRouter / DeepSeek (com fallback mock) |
| Hospedagem | Firebase Hosting (projeto `healthcg`) |
| Testes E2E | Playwright |

---

## 2. Arquitetura

```
┌────────────────────┐
│  Browser (React)   │
│                    │
│  ┌──────────────┐  │
│  │  AuthContext │──┼──► sessão JWT
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │  appClient   │──┼──► entities.* (CRUD + Zod)
│  │              │──┼──► auth.* (Supabase Auth)
│  │              │──┼──► integrations.Core.UploadFile (Storage)
│  │              │──┼──► integrations.Core.InvokeLLM (IA)
│  └──────────────┘  │
└─────────┬──────────┘
          │ HTTPS
          ▼
┌────────────────────────────┐
│         Supabase           │
│  ┌──────────────────────┐  │
│  │ Auth (JWT)           │  │
│  │ PostgREST  →  PG     │  │
│  │ Storage (buckets)    │  │
│  │ Realtime (websocket) │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

### Fluxo padrão de uma operação

1. Componente React invoca `appClient.entities.X.{list|filter|create|update|delete}`.
2. `appClient` valida o payload via Zod (`src/domain/schemas.js`).
3. `appClient` aplica filtros server-side (`eq`, `gte`, `lte`, `in`, `ne`) na query Supabase.
4. RLS (Row Level Security) checa `auth.jwt() ->> 'email'` contra `payload.user_id`/`created_by`.
5. Resposta é cacheada pelo React Query.
6. `RealtimeQuerySync` escuta eventos `insert/update/delete` e invalida o cache automaticamente.

### Fluxo funcional de gamificação

1. Usuário registra 4º copo de água em `WaterTracker`.
2. `appClient.entities.DailyGoal.update` persiste o consumo.
3. `AchievementSystem.checkAndUnlockBadges` é chamado.
4. Sistema verifica `requirement_type: 'water_total'` e `requirement_value`.
5. Cria `UserBadge`, soma XP no `UserProfile`, gera `Notification`.
6. UI exibe popup de conquista (canvas-confetti + framer-motion).

---

## 3. Estrutura de pastas

```
health-app/
├── e2e/                    # Testes Playwright
│   ├── auth.spec.js        # Login, Register, ForgotPassword
│   ├── routing.spec.js     # Proteção de rotas
│   ├── smoke.spec.js       # Smoke tests do bundle
│   └── _helpers.js         # Helpers (screenshot, bug report)
├── scripts/
│   └── supabase/
│       ├── setupTables.js  # Cria tabelas detectadas no código
│       ├── applyHardening.js # Aplica migrations SQL
│       └── migrations/     # SQL de RLS e hardening
├── src/
│   ├── api/appClient.js    # Gateway de persistência
│   ├── domain/schemas.js   # Validação Zod por entidade
│   ├── lib/                # supabaseClient, AuthContext, Realtime
│   ├── components/         # UI por domínio (auth, gamification, food, water...)
│   ├── pages/              # Rotas (Home, Goals, Achievements, etc.)
│   ├── App.jsx             # Router + AuthGuard
│   └── Layout.jsx          # Shell (sidebar, header, theme)
├── firebase.json           # Configuração Firebase Hosting
├── playwright.config.js    # Configuração de testes E2E
└── package.json
```

---

## 4. Manual de execução

### 4.1. Pré-requisitos

- Node.js 18+ e npm 9+
- Conta Supabase (URL + anon key)
- (Opcional) Chave OpenRouter ou DeepSeek para IA
- (Opcional) Firebase CLI para deploy

### 4.2. Instalação

```bash
cd health-app
npm install
```

### 4.3. Configuração de ambiente

Crie `.env.local` na raiz de `health-app/`:

```bash
# Supabase (obrigatório para sincronização real)
VITE_SUPABASE_URL=https://seu-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key

# Hardening (opcional, só para rodar scripts/supabase/*)
SUPABASE_DB_URL=postgresql://postgres:senha@db.seu-ref.supabase.co:5432/postgres
SUPABASE_PROJECT_REF=seu-ref

# LLM (opcional - sem chave, usa mock local)
VITE_LLM_PROVIDER=auto
VITE_OPENROUTER_API_KEY=sua-chave
VITE_OPENROUTER_MODEL=openai/gpt-oss-20b:free
```

> **Modo offline**: sem `VITE_SUPABASE_*`, o app usa `localStorage` como fallback (não sincroniza entre dispositivos, mas funciona para demo local).

### 4.4. Provisionar banco (primeiro uso)

```bash
npm run supabase:setup    # cria tabelas
npm run supabase:harden   # aplica RLS + grants restritos
```

Em seguida, no painel Supabase: **Database → Replication → Enable Realtime** para as tabelas usadas.

### 4.5. Rodar em desenvolvimento

```bash
npm run dev
# abre em http://localhost:5173
```

### 4.6. Build de produção

```bash
npm run build       # gera dist/
npm run preview     # serve dist/ localmente em :4173
```

### 4.7. Lint e type-check

```bash
npm run lint        # ESLint (modo --quiet)
npm run lint:fix    # auto-fix
npm run typecheck   # TypeScript em modo check (jsconfig)
```

### 4.8. Testes E2E

```bash
npm run test:e2e          # roda Playwright headless
npm run test:e2e:headed   # abre browser visível
```

Os testes iniciam o dev server automaticamente. Artefatos vão para `e2e/reports/` e `e2e/screenshots/`.

### 4.9. Deploy (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting   # projeto: healthcg
```

URL pública: `https://healthcg.web.app` (definida em `.firebaserc`).

---

## 5. Fluxos principais do sistema

### 5.1. Cadastro e autenticação

1. Usuário acessa `/Register`, preenche dados em 4 passos (perfil, contato, físico, objetivo).
2. Submit → `appClient.auth.register` → Supabase Auth gera usuário + JWT.
3. Dados de perfil ficam em `pending_profile_<email>` no localStorage até o primeiro login.
4. No login (`/Login`), `appClient.auth.login` valida credenciais; `finalizePendingProfileIfAny` cria/atualiza `UserProfile`.
5. Sessão é mantida via `persistSession: true` + `autoRefreshToken: true` no cliente Supabase.

### 5.2. Registro de hábitos

| Hábito | Componente | Entidade |
|--------|-----------|----------|
| Água | `WaterTracker.jsx` | `WaterEntry` + `DailyGoal.water_consumed_ml` |
| Alimentação | `FoodTracker.jsx`, `NutritionTracker.jsx` | `FoodEntry`, `DailyNutrition` |
| Exercício | `WorkoutTracker.jsx` | `WorkoutSession`, `ExerciseLog` |
| Wearables | `WearableConnection.jsx` | `HealthData` (steps, sleep, HR) |

Todo `create/update` retorna imediatamente; o `RealtimeQuerySync` propaga mudanças para outras abas/dispositivos via canal Postgres Realtime.

### 5.3. Gamificação

- **XP**: somado por ações (ex.: 1 XP por copo de água, 100 XP por meta diária).
- **Nível**: `Math.floor(xp / 100) + 1`.
- **Badges**: 30+ predefinidos em `PredefinedBadges` (níveis, streaks, total de água, treinos completos, etc.).
- **Streak**: dias consecutivos com `DailyGoal.completed = true` (calculado em `AchievementSystem.calculateUserStats`).
- **Notificações**: criadas automaticamente quando um badge é desbloqueado (`NotificationHelper.createNotification`).

### 5.4. IA (treino e dieta)

- `integrations.Core.InvokeLLM` aceita um prompt + JSON schema esperado.
- Provider é resolvido em runtime: OpenRouter → DeepSeek → mock local.
- Geração de plano alimentar e rotinas de treino personalizadas com base no perfil.
- Em produção, recomenda-se mover essa chamada para uma Edge Function para não expor chave no front-end.

### 5.5. Upload de arquivos

`integrations.Core.UploadFile({ file })` envia para o bucket `health-app-uploads` no Supabase Storage e retorna `{ file_url }` público. Sem Supabase, faz fallback para `URL.createObjectURL` local.

---

## 6. Segurança

### 6.1. Row Level Security (RLS)

Aplicada por `scripts/supabase/migrations/20260223_001_hardening.sql`:

- Função `public.request_user_key()` retorna `auth.jwt() ->> 'email'` (legado) ou `auth.uid()::text`.
- Função `public.can_read_payload(jsonb)` valida ownership comparando `user_id`, `created_by`, `nutritionist_id`, `patient_id` do payload com a chave do JWT.
- Privilégios de `anon` e `authenticated` reduzidos ao mínimo necessário.

### 6.2. Validação de entrada

`src/domain/schemas.js` define schemas Zod para cada entidade. O `appClient.entities.X.create/update` rejeita payloads inválidos antes de chegar ao banco.

### 6.3. Boas práticas recomendadas

- **Não** commitar `.env.local` (já está no `.gitignore`).
- Rotacionar chaves expostas no histórico.
- Mover chamadas LLM para backend antes de ir a produção pública.
- Habilitar **email confirmation** no Supabase para evitar contas falsas.

---

## 7. Testes automatizados

Suíte E2E em **Playwright** com 3 specs:

| Spec | Cobertura |
|------|-----------|
| `e2e/auth.spec.js` | Renderização de Login/Register, validação de campos obrigatórios, link de recuperação |
| `e2e/routing.spec.js` | Proteção de rotas: 5 rotas privadas + raiz redirecionam para `/Login` |
| `e2e/smoke.spec.js` | Bundle monta sem erros JS críticos; assets básicos renderizam |

Helpers em `e2e/_helpers.js`:
- `attachConsoleLogging` — captura `console.error`, `pageerror`, `requestfailed`, respostas 4xx/5xx.
- `recordBug` — anexa entrada em `e2e/reports/bugs.md` com screenshot.
- `uniqueEmail` — gera email único por execução (útil para testes que criam contas).

---

## 8. Troubleshooting

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| "Authentication required" no console | Sem `VITE_SUPABASE_*` configurado | Criar `.env.local` ou ignorar (modo local funciona) |
| RLS bloqueia leitura | `payload.user_id` não bate com JWT | Verificar `created_by`/`user_id` no insert |
| Realtime não atualiza | Replication não habilitado para a tabela | Painel Supabase → Database → Replication → toggle |
| Build falha com "Module not found" | Cache do Vite | `rm -rf node_modules/.vite && npm run dev` |
| `firebase deploy` pede login | Sessão expirada | `firebase login --reauth` |

---

## 9. Roadmap (pós-entrega 20/06)

- Migrar chamadas LLM para Edge Function.
- Cobertura E2E para fluxos autenticados (com seed de banco de teste).
- PWA: já há `manifest.json`; falta service worker para offline.
- Integração real com Apple Health / Google Fit (hoje é mock em `WearableConnection`).

---

## 10. Contato e equipe

Projeto desenvolvido como TCC. Dúvidas via repositório no GitHub.
