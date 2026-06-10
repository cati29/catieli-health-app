# API.md — Referência do `appClient`

O front-end interage com Supabase **exclusivamente** através de `src/api/appClient.js`. Este gateway oferece três grupos de operações:

- `appClient.auth.*` — autenticação (Supabase Auth)
- `appClient.entities.*` — CRUD sobre 27 entidades (PostgreSQL via PostgREST)
- `appClient.integrations.Core.*` — Upload de arquivos (Storage) e chamadas LLM (IA)

Todas as operações são **assíncronas** (retornam `Promise`) e, quando aplicável, fazem fallback para `localStorage` se Supabase não estiver configurado.

---

## 1. `appClient.auth`

### `auth.register({ email, password, full_name, ... })`
Cria conta via Supabase Auth. Metadata (`full_name`, `role`) vai para `user_metadata`. Retorna `{ user, session }`.

### `auth.login(email, password)`
Faz signin. Em sucesso, sessão é persistida automaticamente em `localStorage`.

### `auth.logout(redirectPath?)`
Encerra sessão. Se `redirectPath` for passado, faz `window.location.href = redirectPath`.

### `auth.me()`
Retorna `{ id, email, full_name, role }` do usuário autenticado. Lança erro se não houver sessão.

### `auth.isAuthenticated()`
Retorna `boolean`.

### `auth.onAuthStateChange(callback)`
Inscreve callback em mudanças de sessão. Retorna função de unsubscribe.

### `auth.resetPasswordForEmail(email, redirectTo?)`
Envia email de recuperação. Retorna `{ data, error }`.

### `auth.updatePassword(newPassword)`
Atualiza senha do usuário logado.

### `auth.redirectToLogin(currentUrl)`
Helper que navega para `/Login?from_url=<encoded>`.

---

## 2. `appClient.entities`

Cada entidade expõe a mesma interface:

| Método | Assinatura | Comportamento |
|--------|-----------|---------------|
| `list()` | `() => Promise<Item[]>` | Retorna até 200 itens, ordenados por `-created_date` |
| `filter(criteria, sortBy?, limit?)` | `(obj, string?, number?) => Promise<Item[]>` | Filtros server-side (ver abaixo) |
| `get(id)` | `(string) => Promise<Item \| null>` | Busca por ID |
| `create(payload)` | `(obj) => Promise<Item>` | Valida com Zod, normaliza ownership, retorna item criado |
| `update(id, payload)` | `(string, obj) => Promise<Item>` | Controle otimista por `updated_date` |
| `delete(id)` | `(string) => Promise<void>` | Remoção lógica/física conforme política |

### Operadores de filtro

```js
// Igualdade
appClient.entities.DailyGoal.filter({ date: '2026-06-09', user_id: 'a@b.com' });

// Lista (IN)
appClient.entities.Badge.filter({ category: ['water', 'streak'] });

// Range
appClient.entities.WaterEntry.filter({
  date: { gte: '2026-06-01', lte: '2026-06-09' }
});

// Operadores: gte, lte, gt, lt, ne, eq
```

### Modelo de dados

Cada tabela tem o formato genérico:
```sql
id          UUID PRIMARY KEY
created_date TIMESTAMP
updated_date TIMESTAMP
payload      JSONB     -- todos os campos da entidade
```
Os campos do `payload` são acessíveis via `payload->>campo` (string) ou `payload->campo` (jsonb).

### Catálogo de entidades (27)

#### Perfil & autenticação
| Entidade | Campos principais | Descrição |
|----------|------------------|-----------|
| `UserProfile` | `first_name`, `last_name`, `age`, `height`, `weight`, `goal`, `user_type`, `xp`, `level`, `plan_type` | Perfil de usuário ou nutricionista |
| `Subscription` | `user_id`, `plan_type`, `status`, `started_at`, `expires_at` | Assinatura Stripe |

#### Hábitos diários
| Entidade | Campos principais | Descrição |
|----------|------------------|-----------|
| `DailyGoal` | `date`, `water_goal_ml`, `water_consumed_ml`, `calorie_goal`, `exercise_minutes_goal`, `completed` | Meta diária consolidada |
| `WaterEntry` | `date`, `amount_ml` | Cada copo registrado |
| `FoodEntry` | `date`, `food_name`, `quantity_grams`, `meal_type`, `calories`, `protein_g`, `carbs_g`, `fat_g` | Registro de alimento |
| `DailyNutrition` | `date`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g` | Resumo nutricional diário |
| `HealthData` | `date`, `steps`, `heart_rate_avg`, `sleep_hours`, `sleep_quality`, `active_minutes`, `calories_burned`, `distance_km` | Dados de wearables |

#### Treino
| Entidade | Campos principais | Descrição |
|----------|------------------|-----------|
| `Exercise` | `name`, `muscle_group`, `equipment`, `difficulty`, `instructions` | Catálogo de exercícios |
| `WorkoutRoutine` | `name`, `exercises`, `target_muscles`, `frequency` | Rotina criada pelo usuário/IA |
| `WorkoutSession` | `date`, `routine_id`, `duration_minutes`, `completed` | Sessão executada |
| `ExerciseLog` | `session_id`, `exercise_id`, `sets`, `reps`, `weight_kg` | Log de série |

#### Nutrição
| Entidade | Campos principais | Descrição |
|----------|------------------|-----------|
| `FoodDatabase` | `name`, `calories_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g` | Banco de alimentos |
| `MealPlan` | `name`, `goal`, `start_date`, `end_date` | Plano alimentar |
| `Meal` | `meal_plan_id`, `day`, `meal_type`, `foods` | Refeição dentro do plano |

#### Gamificação
| Entidade | Campos principais | Descrição |
|----------|------------------|-----------|
| `Badge` | `name`, `description`, `icon`, `category`, `requirement_type`, `requirement_value`, `xp_reward`, `rarity` | Conquista disponível |
| `UserBadge` | `user_id`, `badge_id`, `unlocked_date` | Badge desbloqueado |
| `Challenge` | `name`, `description`, `start_date`, `end_date`, `goal_value` | Desafio do sistema |
| `UserChallenge` | `user_id`, `challenge_id`, `progress`, `completed` | Progresso individual |

#### Social
| Entidade | Campos principais | Descrição |
|----------|------------------|-----------|
| `Post` | `content`, `image_url`, `likes`, `comments` | Post no feed |
| `Group` | `name`, `description`, `cover_image`, `is_private` | Grupo de usuários |
| `GroupMember` | `group_id`, `user_id`, `role`, `joined_at` | Membro do grupo |
| `GroupChallenge` | `group_id`, `challenge_id`, `start_date` | Desafio coletivo |

#### Comunicação
| Entidade | Campos principais | Descrição |
|----------|------------------|-----------|
| `Conversation` | `nutritionist_id`, `patient_id`, `last_message_at` | Thread entre nutri e paciente |
| `ChatMessage` | `conversation_id`, `sender_id`, `receiver_id`, `content`, `read` | Mensagem |
| `Notification` | `user_id`, `type`, `title`, `message`, `action_url`, `read` | Push/in-app notification |

#### Nutricionista ↔ paciente
| Entidade | Campos principais | Descrição |
|----------|------------------|-----------|
| `PatientGoalAssignment` | `nutritionist_id`, `patient_id`, `goal_type`, `target_value`, `deadline` | Meta atribuída ao paciente |

#### Sistema
| Entidade | Campos principais | Descrição |
|----------|------------------|-----------|
| `AppUpdate` | `version`, `title`, `description`, `release_date` | Changelog visível em `/AppUpdates` |
| `AppLogs` | `level`, `message`, `context` | Logs internos |

---

## 3. `appClient.integrations.Core`

### `UploadFile({ file })`
Envia `File` para o bucket `health-app-uploads` no Supabase Storage. Retorna `{ file_url }` com URL pública. Sem Supabase, faz fallback para `URL.createObjectURL` (URL local temporária).

```js
const { file_url } = await appClient.integrations.Core.UploadFile({ file });
```

### `InvokeLLM({ prompt, response_json_schema? })`
Chama o LLM configurado (OpenRouter → DeepSeek → mock). Retorna o JSON parseado conforme o schema.

```js
const plan = await appClient.integrations.Core.InvokeLLM({
  prompt: 'Crie plano de treino para iniciante focado em força',
  response_json_schema: {
    type: 'object',
    properties: {
      routines: { type: 'array', items: { /* ... */ } }
    }
  }
});
```

Variáveis de ambiente que controlam o provider:
- `VITE_LLM_PROVIDER` — `auto` (default), `openrouter`, `deepseek` ou `mock`
- `VITE_OPENROUTER_API_KEY`, `VITE_OPENROUTER_MODEL`
- `VITE_DEEPSEEK_API_KEY`, `VITE_DEEPSEEK_MODEL`
- `VITE_LLM_TEMPERATURE` (default `0.3`)
- `VITE_LLM_MAX_TOKENS` (opcional)

---

## 4. Convenções

### Identificação de ownership

Toda entidade aceita os campos opcionais:
- `user_id` — chave primária do dono (email no projeto atual)
- `created_by` — fallback compatível com dados legados
- `nutritionist_id` / `patient_id` — relacionamentos profissional/cliente
- `sender_id` / `receiver_id` — usados em `ChatMessage`

`appClient` normaliza automaticamente: se passar só `sender_id`, o `user_id` é preenchido a partir dele; se nenhum estiver presente, usa o email da sessão atual.

### Controle de concorrência

Em `update`, se você passar `__expected_updated_date` no payload, a operação só persiste se a versão atual no banco bater (controle otimista). Caso contrário, lança erro e o React Query pode retentar.

### Validação de referências lógicas

Antes de criar `WorkoutSession`, `Meal` ou `ChatMessage`, o `appClient` verifica que `routine_id`, `meal_plan_id` ou `conversation_id` apontados existem. Lança erro descritivo se não.

---

## 5. Eventos Realtime

O componente `<RealtimeQuerySync />` (montado no `App.jsx`) escuta `postgres_changes` em todas as tabelas configuradas. Quando recebe `INSERT/UPDATE/DELETE`, invalida `queryKey: [tableName]` no React Query, fazendo a UI re-buscar dados automaticamente.

Para habilitar uma tabela:
```
Supabase Dashboard → Database → Replication → Source: supabase_realtime
→ Toggle ON na linha da tabela
```

---

## 6. Erros comuns

| Erro | Origem | Causa |
|------|--------|-------|
| `Supabase client not configured` | qualquer operação | Falta `VITE_SUPABASE_URL`/`ANON_KEY` no `.env.local` |
| `Authentication required` | `auth.me()` | Sessão expirada ou usuário não logou |
| `routine_id invalido para WorkoutSession` | `WorkoutSession.create` | ID da rotina não existe no banco |
| `Validação Zod falhou: ...` | `entities.X.create/update` | Payload não obedece ao schema em `src/domain/schemas.js` |
| `RLS denied` (PostgREST 403) | qualquer leitura/escrita | `payload.user_id` não bate com a chave do JWT |
