import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const rootDir = process.cwd();

const loadEnvFile = (fileName) => {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  }
};

loadEnvFile('.env');
loadEnvFile('.env.local');

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('SUPABASE_DB_URL is required to apply hardening migration');
  process.exit(1);
}

const migrationsDir = path.join(
  rootDir,
  'scripts',
  'supabase',
  'migrations'
);

if (!fs.existsSync(migrationsDir)) {
  console.error('Migrations directory not found:', migrationsDir);
  process.exit(1);
}

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.error('No SQL migrations found in:', migrationsDir);
  process.exit(1);
}

const run = async () => {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    for (const migrationName of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationName);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await client.query(sql);
      console.log(`Applied migration: ${migrationName}`);
    }
    console.log('Supabase hardening migrations applied successfully');
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error('Failed to apply hardening migration:', error.message);
  process.exit(1);
});
