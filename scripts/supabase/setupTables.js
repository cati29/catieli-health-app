import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

const loadEnvFile = (fileName) => {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  });
};

loadEnvFile('.env');
loadEnvFile('.env.local');

const projectRef = process.env.SUPABASE_PROJECT_REF;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dbUrl = process.env.SUPABASE_DB_URL;
const dbName = process.env.SUPABASE_DB_NAME || 'postgres';
const dbUser = process.env.SUPABASE_DB_USER || null;
const dbPort = process.env.SUPABASE_DB_PORT ? Number(process.env.SUPABASE_DB_PORT) : null;
const dbHost = process.env.SUPABASE_DB_HOST || null;

if (!projectRef) {
  console.error('SUPABASE_PROJECT_REF is required');
  process.exit(1);
}

if (!dbUrl && !dbPassword) {
  console.error('SUPABASE_DB_PASSWORD is required');
  process.exit(1);
}

const walkFiles = (dir, collected = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, collected);
      continue;
    }
    if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      collected.push(fullPath);
    }
  }
  return collected;
};

const toSnakeCase = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

const quoteIdent = (identifier) => `"${identifier.replace(/"/g, '""')}"`;

const collectEntities = () => {
  const files = walkFiles(srcDir);
  const names = new Set();
  const regex = /entities\.([A-Za-z0-9_]+)/g;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match = regex.exec(content);
    while (match) {
      names.add(match[1]);
      match = regex.exec(content);
    }
    regex.lastIndex = 0;
  }

  names.add('AppLogs');
  return [...names].sort();
};

const buildSql = (entityNames) => {
  const blocks = entityNames.map((name) => {
    const table = toSnakeCase(name);
    const quotedTable = quoteIdent(table);
    const idxDate = quoteIdent(`idx_${table}_created_date`);
    const idxPayload = quoteIdent(`idx_${table}_payload_gin`);

    return `
CREATE TABLE IF NOT EXISTS ${quotedTable} (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ${idxDate} ON ${quotedTable} (created_date DESC);
CREATE INDEX IF NOT EXISTS ${idxPayload} ON ${quotedTable} USING GIN (payload);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${quotedTable} TO anon, authenticated, service_role;
`;
  });

  return `
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
${blocks.join('\n')}
`;
};

const getCandidates = () => {
  const defaultHosts = [`db.${projectRef}.supabase.co`];
  const regions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'af-south-1',
    'ap-east-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'ap-northeast-3',
    'sa-east-1',
    'ap-south-1',
    'ap-south-2',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-central-1',
    'eu-central-2',
    'eu-north-1',
    'ap-southeast-3',
    'ap-southeast-4',
    'ap-southeast-1',
    'ap-southeast-2',
    'ca-central-1',
    'ca-west-1',
    'eu-south-1',
    'eu-south-2',
    'il-central-1',
    'me-central-1',
    'me-south-1'
  ];

  for (const region of regions) {
    defaultHosts.push(`aws-0-${region}.pooler.supabase.com`);
  }

  const hosts = dbHost ? [dbHost] : defaultHosts;

  const ports = dbPort ? [dbPort] : [5432, 6543];
  const users = dbUser ? [dbUser] : ['postgres', `postgres.${projectRef}`];

  const candidates = [];
  for (const host of hosts) {
    for (const port of ports) {
      for (const user of users) {
        candidates.push({ host, port, user });
      }
    }
  }
  return candidates;
};

const connectWithFallback = async () => {
  if (dbUrl) {
    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    return { client, candidate: { host: 'from SUPABASE_DB_URL', port: '-', user: '-' } };
  }

  const candidates = getCandidates();
  let lastError = null;
  let attempts = 0;

  for (const candidate of candidates) {
    attempts += 1;
    const client = new Client({
      host: candidate.host,
      port: candidate.port,
      user: candidate.user,
      password: dbPassword,
      database: dbName,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      return { client, candidate };
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
    }
  }

  const reason = lastError?.message || 'unknown error';
  throw new Error(`Could not connect to Supabase Postgres after ${attempts} attempts (${reason}). Set SUPABASE_DB_URL with the exact connection string from Supabase dashboard.`);
};

const run = async () => {
  const entities = collectEntities();
  const sql = buildSql(entities);

  const { client, candidate } = await connectWithFallback();
  try {
    console.log(`Connected to ${candidate.host}:${candidate.port} as ${candidate.user}`);
    console.log(`Creating/updating ${entities.length} tables in project ${projectRef}...`);
    await client.query(sql);
    console.log('Schema sync completed');
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error('Schema sync failed:', error.message);
  process.exit(1);
});
