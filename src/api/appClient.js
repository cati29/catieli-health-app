import { ensureOwnershipPayload, validateEntityPayload } from '@/domain/schemas';
import { hasSupabase, supabase } from '@/lib/supabaseClient';

const STORAGE_PREFIX = 'health_app_';
const isBrowser = typeof window !== 'undefined';
const DEFAULT_QUERY_LIMIT = 200;
const RESERVED_FIELDS = new Set(['id', 'created_date', 'updated_date']);

const storage = {
  get(key, fallback = null) {
    if (!isBrowser) return fallback;
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    if (!isBrowser) return;
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  }
};

const entityStore = {
  read(entityName) {
    return storage.get(`entity_${entityName}`, []);
  },
  write(entityName, list) {
    storage.set(`entity_${entityName}`, list);
  }
};

const nowIso = () => new Date().toISOString();

const newId = (entityName) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${entityName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const toSnakeCase = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

const compareValues = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
};

const sortItems = (items, sortBy) => {
  if (!sortBy) return [...items];
  const desc = sortBy.startsWith('-');
  const field = desc ? sortBy.slice(1) : sortBy;
  return [...items].sort((left, right) => {
    const result = compareValues(left[field], right[field]);
    return desc ? -result : result;
  });
};

const filterItems = (items, criteria = {}) =>
  items.filter((item) =>
    Object.entries(criteria).every(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('gte' in value && !(item[key] >= value.gte)) return false;
        if ('lte' in value && !(item[key] <= value.lte)) return false;
        if ('gt' in value && !(item[key] > value.gt)) return false;
        if ('lt' in value && !(item[key] < value.lt)) return false;
        if ('ne' in value && !(item[key] !== value.ne)) return false;
        return true;
      }
      if (Array.isArray(value)) {
        return value.includes(item[key]);
      }
      return item[key] === value;
    })
  );

const fallbackQuery = (entityName, criteria, sortBy, limit) => {
  const items = entityStore.read(entityName);
  const filtered = filterItems(items, criteria);
  const sorted = sortItems(filtered, sortBy);
  return limit ? sorted.slice(0, Number(limit)) : sorted;
};

const stripReservedFields = (data) => {
  const payload = { ...(data || {}) };
  delete payload.id;
  delete payload.created_date;
  delete payload.updated_date;
  delete payload.__expected_updated_date;
  delete payload.__retry_count;
  return payload;
};

const fromSupabaseRow = (row) => {
  if (!row) return null;
  return {
  id: row.id,
  created_date: row.created_date,
  updated_date: row.updated_date,
  ...(row.payload || {})
  };
};

const runSupabase = async (entityName, action) => {
  if (!hasSupabase) {
    throw new Error('Supabase client not configured');
  }
  const table = toSnakeCase(entityName);
  return action(table);
};

const attemptSupabase = async (action, fallback) => {
  if (!hasSupabase) {
    return fallback();
  }
  return action();
};

const ensureSupabaseAuth = () => {
  if (!supabase) {
    throw new Error('Supabase auth não configurado');
  }
};

const getSession = async () => {
  ensureSupabaseAuth();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session || null;
};

const mapAuthUser = (user) => ({
  id: user.id,
  email: user.email || '',
  full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
  role: user.user_metadata?.role || user.app_metadata?.role || 'user'
});

const getCurrentUserKey = async () => {
  const session = await getSession();
  return session?.user?.email || session?.user?.id || null;
};

const normalizeOwnershipFields = (payload, userKey) => {
  const next = { ...(payload || {}) };

  if (!next.user_id && typeof next.sender_id === 'string' && next.sender_id) {
    next.user_id = next.sender_id;
  }

  if (!next.user_id && typeof next.created_by === 'string' && next.created_by) {
    next.user_id = next.created_by;
  }

  if (!next.created_by && typeof next.user_id === 'string' && next.user_id) {
    next.created_by = next.user_id;
  }

  if (!next.created_by && userKey) {
    next.created_by = userKey;
  }

  return next;
};

const columnForField = (field) => (RESERVED_FIELDS.has(field) ? field : `payload->>${field}`);

const formatPayloadValue = (value) => {
  if (value == null) return value;
  if (typeof value === 'string') return value;
  return String(value);
};

const parseRangeFilter = (query, field, value) => {
  const column = columnForField(field);
  const payloadColumn = !RESERVED_FIELDS.has(field);

  let nextQuery = query;
  for (const [operator, operatorValue] of Object.entries(value)) {
    const formattedValue = payloadColumn ? formatPayloadValue(operatorValue) : operatorValue;
    if (operator === 'gte') nextQuery = nextQuery.gte(column, formattedValue);
    if (operator === 'lte') nextQuery = nextQuery.lte(column, formattedValue);
    if (operator === 'gt') nextQuery = nextQuery.gt(column, formattedValue);
    if (operator === 'lt') nextQuery = nextQuery.lt(column, formattedValue);
    if (operator === 'ne') nextQuery = nextQuery.neq(column, formattedValue);
    if (operator === 'eq') nextQuery = nextQuery.eq(column, formattedValue);
  }
  return nextQuery;
};

const applyCriteriaToQuery = (query, criteria = {}) => {
  let nextQuery = query;

  for (const [field, value] of Object.entries(criteria)) {
    const column = columnForField(field);
    const payloadColumn = !RESERVED_FIELDS.has(field);

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      const formattedValues = payloadColumn ? value.map(formatPayloadValue) : value;
      if (payloadColumn) {
        const inList = `(${formattedValues
          .map((item) => `"${String(item).replace(/"/g, '\\"')}"`)
          .join(',')})`;
        nextQuery = nextQuery.filter(column, 'in', inList);
      } else {
        nextQuery = nextQuery.in(column, formattedValues);
      }
      continue;
    }

    if (value == null) {
      nextQuery = nextQuery.is(column, null);
      continue;
    }

    if (typeof value === 'object') {
      nextQuery = parseRangeFilter(nextQuery, field, value);
      continue;
    }

    nextQuery = nextQuery.eq(column, payloadColumn ? formatPayloadValue(value) : value);
  }

  return nextQuery;
};

const applyServerSort = (query, sortBy) => {
  if (!sortBy) return query;
  const desc = sortBy.startsWith('-');
  const field = desc ? sortBy.slice(1) : sortBy;
  if (!RESERVED_FIELDS.has(field)) {
    return query;
  }
  return query.order(field, { ascending: !desc });
};

const resolveLimit = (limit) => {
  if (!limit) return DEFAULT_QUERY_LIMIT;
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_QUERY_LIMIT;
  return Math.min(Math.trunc(n), DEFAULT_QUERY_LIMIT);
};

const validateLogicalReferences = async (entityName, payload, userKey) => {
  if (!hasSupabase) return;

  if (entityName === 'WorkoutSession' && payload.routine_id) {
    const row = await runSupabase('WorkoutRoutine', async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select('id,payload')
        .eq('id', payload.routine_id)
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    });
    if (!row) {
      throw new Error('routine_id invalido para WorkoutSession');
    }
  }

  if (entityName === 'Meal' && payload.meal_plan_id) {
    const row = await runSupabase('MealPlan', async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select('id,payload')
        .eq('id', payload.meal_plan_id)
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    });
    if (!row) {
      throw new Error('meal_plan_id invalido para Meal');
    }
  }

  if (entityName === 'ChatMessage' && payload.conversation_id) {
    const conversationRow = await runSupabase('Conversation', async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select('id,payload')
        .eq('id', payload.conversation_id)
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    });

    if (!conversationRow) {
      throw new Error('conversation_id invalido para ChatMessage');
    }

    const conversation = conversationRow.payload || {};
    if (
      userKey &&
      userKey !== conversation.user_id &&
      userKey !== conversation.nutritionist_id &&
      userKey !== payload.sender_id &&
      userKey !== payload.receiver_id
    ) {
      throw new Error('Usuário sem permissão para interagir nesta conversa');
    }
  }
};

const auth = {
  async getSession() {
    return getSession();
  },
  async isAuthenticated() {
    const session = await getSession();
    return Boolean(session?.user);
  },
  async me() {
    const session = await getSession();
    if (!session?.user) {
      throw new Error('Sessão invalida ou expirada');
    }
    return mapAuthUser(session.user);
  },
  async login(email, password) {
    ensureSupabaseAuth();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    if (!data.user) throw new Error('Falha ao autenticar');
    return {
      user: mapAuthUser(data.user),
      session: data.session
    };
  },
  async signUp({ email, password, metadata = {} }) {
    ensureSupabaseAuth();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    if (error) throw error;
    // Supabase anti-enumeration: when email confirmation is enabled and the email
    // already exists, signUp returns a "soft success" with an empty identities[]
    // instead of an explicit conflict error. Detect and surface it as a real error.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const conflictError = new Error('Este email já esta cadastrado. Faça login ou recupere sua senha.');
      conflictError.code = 'EMAIL_ALREADY_REGISTERED';
      throw conflictError;
    }
    return {
      user: data.user ? mapAuthUser(data.user) : null,
      session: data.session
    };
  },
  async requestPasswordReset(email) {
    ensureSupabaseAuth();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: isBrowser ? `${window.location.origin}/ResetPassword` : undefined
    });
    if (error) throw error;
    return { success: true };
  },
  async updatePassword(newPassword) {
    ensureSupabaseAuth();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true };
  },
  onAuthStateChange(callback) {
    if (!supabase) {
      return () => {};
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => data.subscription.unsubscribe();
  },
  async logout(redirectTo) {
    if (supabase) {
      await supabase.auth.signOut();
    }
    storage.set('token', null);
    if (redirectTo && isBrowser) {
      window.location.href = redirectTo;
    }
  },
  redirectToLogin(fromUrl) {
    if (!isBrowser) return;
    const target = fromUrl ? `/Login?from_url=${encodeURIComponent(fromUrl)}` : '/Login';
    window.location.href = target;
  }
};

const entities = new Proxy({}, {
  get(_target, entityNameRaw) {
    const entityName = String(entityNameRaw);

    return {
      async list(sortBy, limit) {
        const fallback = () => fallbackQuery(entityName, {}, sortBy, limit);

        return attemptSupabase(async () => {
          const rows = await runSupabase(entityName, async (table) => {
            let query = supabase
              .from(table)
              .select('id,payload,created_date,updated_date');
            query = applyServerSort(query, sortBy).limit(resolveLimit(limit));
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
          });

          const items = rows.map(fromSupabaseRow);
          const sorted = sortBy && !RESERVED_FIELDS.has(sortBy.replace(/^-/, ''))
            ? sortItems(items, sortBy)
            : items;
          return limit ? sorted.slice(0, Number(limit)) : sorted;
        }, fallback);
      },

      async filter(criteria = {}, sortBy, limit) {
        const fallback = () => fallbackQuery(entityName, criteria, sortBy, limit);

        return attemptSupabase(async () => {
          const rows = await runSupabase(entityName, async (table) => {
            let query = supabase
              .from(table)
              .select('id,payload,created_date,updated_date');
            query = applyCriteriaToQuery(query, criteria);
            query = applyServerSort(query, sortBy).limit(resolveLimit(limit));
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
          });

          const items = rows.map(fromSupabaseRow);
          const sorted = sortBy && !RESERVED_FIELDS.has(sortBy.replace(/^-/, ''))
            ? sortItems(items, sortBy)
            : items;
          return limit ? sorted.slice(0, Number(limit)) : sorted;
        }, fallback);
      },

      async create(data) {
        // Nutricionista nao pode iniciar Conversation (regra de negocio: so o atleta inicia).
        if (entityName === 'Conversation') {
          try {
            const session = await getSession();
            const role = session?.user?.user_metadata?.role || session?.user?.app_metadata?.role;
            if (role === 'nutritionist') {
              const conflictError = new Error('Nutricionistas nao podem iniciar conversas. Aguarde o paciente entrar em contato.');
              conflictError.code = 'NUTRITIONIST_CANNOT_INITIATE_CONVERSATION';
              throw conflictError;
            }
          } catch (sessionError) {
            if (sessionError?.code === 'NUTRITIONIST_CANNOT_INITIATE_CONVERSATION') throw sessionError;
            // Sessao indisponivel -> deixa o fluxo seguir e errar mais a frente.
          }
        }

        const fallback = () => {
          const timestamp = nowIso();
          const item = {
            id: data?.id || newId(entityName),
            created_date: data?.created_date || timestamp,
            updated_date: timestamp,
            ...data
          };
          const items = entityStore.read(entityName);
          items.push(item);
          entityStore.write(entityName, items);
          return item;
        };

        return attemptSupabase(async () => {
          const timestamp = nowIso();
          const id = data?.id || newId(entityName);
          const createdDate = data?.created_date || timestamp;
          const userKey = await getCurrentUserKey();
          const normalizedPayload = normalizeOwnershipFields(stripReservedFields(data), userKey);
          const ownedPayload = ensureOwnershipPayload(entityName, normalizedPayload, userKey);
          const payload = validateEntityPayload(entityName, ownedPayload);
          await validateLogicalReferences(entityName, payload, userKey);

          const row = {
            id,
            payload,
            created_date: createdDate,
            updated_date: timestamp
          };

          const inserted = await runSupabase(entityName, async (table) => {
            const { data: rows, error } = await supabase
              .from(table)
              .insert(row)
              .select('id,payload,created_date,updated_date')
              .limit(1);
            if (error) throw error;
            return rows?.[0];
          });

          return fromSupabaseRow(inserted);
        }, fallback);
      },

      async update(id, data) {
        const fallback = () => {
          const items = entityStore.read(entityName);
          const index = items.findIndex((item) => item.id === id);
          if (index < 0) {
            throw new Error(`${entityName} with id ${id} was not found`);
          }
          items[index] = {
            ...items[index],
            ...data,
            updated_date: nowIso()
          };
          entityStore.write(entityName, items);
          return items[index];
        };

        return attemptSupabase(async () => {
          const patch = stripReservedFields(data);
          const expectedUpdatedDate = data?.__expected_updated_date || null;
          const retryCount = Math.max(1, Number(data?.__retry_count ?? 2));
          const userKey = await getCurrentUserKey();

          for (let attempt = 0; attempt < retryCount; attempt += 1) {
            const existing = await runSupabase(entityName, async (table) => {
              const { data: row, error } = await supabase
                .from(table)
                .select('id,payload,created_date,updated_date')
                .eq('id', id)
                .maybeSingle();
              if (error) throw error;
              return row;
            });

            if (!existing) {
              throw new Error(`${entityName} with id ${id} was not found`);
            }

            const merged = normalizeOwnershipFields(
              {
                ...(existing.payload || {}),
                ...patch
              },
              userKey
            );
            const mergedPayload = validateEntityPayload(entityName, merged);
            await validateLogicalReferences(entityName, mergedPayload, userKey);
            const versionKey = expectedUpdatedDate || existing.updated_date;

            const updated = await runSupabase(entityName, async (table) => {
              let query = supabase
                .from(table)
                .update({
                  payload: mergedPayload,
                  updated_date: nowIso()
                })
                .eq('id', id);

              if (versionKey) {
                query = query.eq('updated_date', versionKey);
              }

              const { data: rows, error } = await query
                .select('id,payload,created_date,updated_date')
                .limit(1);

              if (error) throw error;
              return rows?.[0] || null;
            });

            if (updated) {
              return fromSupabaseRow(updated);
            }

            if (expectedUpdatedDate) {
              throw new Error(`Concurrency conflict while updating ${entityName}`);
            }
          }

          throw new Error(`Concurrency conflict while updating ${entityName}`);
        }, fallback);
      },

      async delete(id) {
        const fallback = () => {
          const items = entityStore.read(entityName);
          const next = items.filter((item) => item.id !== id);
          entityStore.write(entityName, next);
          return { id, deleted: true };
        };

        return attemptSupabase(async () => {
          await runSupabase(entityName, async (table) => {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
          });
          return { id, deleted: true };
        }, fallback);
      }
    };
  }
});

const env = import.meta?.env || {};

const LLM_PROVIDER = String(env.VITE_LLM_PROVIDER || 'auto').toLowerCase();
const OPENROUTER_API_KEY = env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = env.VITE_OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
const OPENROUTER_ENDPOINT = env.VITE_OPENROUTER_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_SITE_URL = env.VITE_OPENROUTER_SITE_URL || (isBrowser ? window.location.origin : 'http://localhost');
const OPENROUTER_APP_NAME = env.VITE_OPENROUTER_APP_NAME || 'Health App';

const DEEPSEEK_API_KEY = env.VITE_DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = env.VITE_DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_ENDPOINT = env.VITE_DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/chat/completions';

const LLM_TEMPERATURE = Number(env.VITE_LLM_TEMPERATURE ?? 0.3);
const LLM_MAX_TOKENS = env.VITE_LLM_MAX_TOKENS ? Number(env.VITE_LLM_MAX_TOKENS) : null;

const toJsonText = (content) => {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === 'string') return chunk;
        if (chunk?.type === 'text' && typeof chunk?.text === 'string') return chunk.text;
        if (typeof chunk?.content === 'string') return chunk.content;
        return '';
      })
      .join('')
      .trim();
  }
  return '';
};

const parseJsonFromText = (rawText) => {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) {
    throw new Error('Resposta vazia do modelo');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = fencedMatch?.[1]?.trim() || trimmed;

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error('Falha ao parsear JSON retornado pelo modelo');
  }
};

const createMockLLMResponse = (responseJsonSchema) => {
  const props = responseJsonSchema?.properties || {};

  if (props.days) {
    return {
      plan_title: 'Plano Alimentar Semanal',
      days: Array.from({ length: 7 }).map((_, index) => ({
        day: index + 1,
        meals: []
      }))
    };
  }

  if (props.routines) {
    return {
      weekly_plan: {
        title: 'Plano de Treino Semanal',
        description: 'Plano base com variação de intensidade durante a semana.',
        recovery_notes: 'Inclua mobilidade e hidratação diária.'
      },
      routines: []
    };
  }

  return { ok: true };
};

const composePromptWithSchema = (prompt, responseJsonSchema) => {
  if (!responseJsonSchema) {
    return `${prompt}\n\nRetorne apenas JSON valido, sem markdown.`;
  }

  return [
    prompt,
    '',
    'Responda exclusivamente com JSON valido (sem markdown).',
    'Siga este JSON schema:',
    JSON.stringify(responseJsonSchema)
  ].join('\n');
};

const requestChatCompletion = async ({
  endpoint,
  apiKey,
  model,
  prompt,
  responseJsonSchema,
  extraHeaders = {}
}) => {
  if (!apiKey) {
    throw new Error('API key não configurada para o provider LLM');
  }

  const messages = [
    {
      role: 'system',
      content: 'Você e um assistente de saúde e treino. Responda com JSON valido seguindo o schema solicitado.'
    },
    {
      role: 'user',
      content: composePromptWithSchema(prompt, responseJsonSchema)
    }
  ];

  const bodyBase = {
    model,
    messages,
    temperature: Number.isFinite(LLM_TEMPERATURE) ? LLM_TEMPERATURE : 0.3
  };

  if (Number.isFinite(LLM_MAX_TOKENS) && LLM_MAX_TOKENS > 0) {
    bodyBase.max_tokens = Math.trunc(LLM_MAX_TOKENS);
  }

  const performRequest = async (payload) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders
      },
      body: JSON.stringify(payload)
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        responseBody?.error?.message ||
        responseBody?.message ||
        `Falha na chamada LLM (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return responseBody;
  };

  let responseBody;
  try {
    responseBody = await performRequest({
      ...bodyBase,
      response_format: { type: 'json_object' }
    });
  } catch (error) {
    if (error?.status !== 400) throw error;
    responseBody = await performRequest(bodyBase);
  }

  const content = toJsonText(responseBody?.choices?.[0]?.message?.content);
  return parseJsonFromText(content);
};

const resolveLLMProvider = () => {
  if (LLM_PROVIDER && LLM_PROVIDER !== 'auto') {
    return LLM_PROVIDER;
  }
  if (OPENROUTER_API_KEY) return 'openrouter';
  if (DEEPSEEK_API_KEY) return 'deepseek';
  return 'mock';
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      if (supabase) {
        try {
          const bucket = 'health-app-uploads';
          const fileName = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
          const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
          if (!uploadError) {
            const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
            if (data?.publicUrl) {
              return { file_url: data.publicUrl };
            }
          }
        } catch (error) {
          console.warn('Supabase storage upload failed, using local blob URL', error);
        }
      }
      const fileUrl = file && isBrowser ? URL.createObjectURL(file) : '';
      return { file_url: fileUrl };
    },
    async SendEmail(payload) {
      if (typeof console !== 'undefined') {
        console.info('Email simulation', payload);
      }
      return { success: true };
    },
    async InvokeLLM({ prompt = '', response_json_schema: responseJsonSchema } = {}) {
      const provider = resolveLLMProvider();

      try {
        if (provider === 'openrouter') {
          return requestChatCompletion({
            endpoint: OPENROUTER_ENDPOINT,
            apiKey: OPENROUTER_API_KEY,
            model: OPENROUTER_MODEL,
            prompt,
            responseJsonSchema,
            extraHeaders: {
              'HTTP-Referer': OPENROUTER_SITE_URL,
              'X-Title': OPENROUTER_APP_NAME
            }
          });
        }

        if (provider === 'deepseek') {
          return requestChatCompletion({
            endpoint: DEEPSEEK_ENDPOINT,
            apiKey: DEEPSEEK_API_KEY,
            model: DEEPSEEK_MODEL,
            prompt,
            responseJsonSchema
          });
        }
      } catch (error) {
        if (typeof console !== 'undefined') {
          console.warn(`LLM provider "${provider}" falhou, usando fallback local`, error);
        }
      }

      return createMockLLMResponse(responseJsonSchema);
    }
  }
};

const appLogs = {
  async logUserInApp(pageName) {
    try {
      const user = await auth.me();
      await entities.AppLogs.create({
        user_id: user.email,
        created_by: user.email,
        page_name: pageName,
        logged_at: nowIso()
      });
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.warn('Failed to store app log', error);
      }
    }
    return { ok: true };
  }
};

export const appClient = {
  auth,
  entities,
  integrations,
  appLogs,
  supabaseReady: hasSupabase
};
