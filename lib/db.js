import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

let sqlClient = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || null;
}

export function isNeonConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getDb() {
  const url = getDatabaseUrl();
  if (!url) return null;
  if (!sqlClient) {
    sqlClient = neon(url);
  }
  return sqlClient;
}

/**
 * Executes a Neon query function with automatic retry for compute cold-starts
 */
export async function queryWithRetry(fn, retries = 3, delayMs = 600) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      console.warn(`Neon compute cold-start/retry attempt ${attempt}/${retries}... (${err.message})`);
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

/**
 * Initializes database tables if they do not exist
 * and seeds them from existing JSON files if empty.
 */
export async function initDatabase() {
  const sql = getDb();
  if (!sql) return { initialized: false, reason: 'No DATABASE_URL configured' };

  try {
    // 1. Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS judges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        alternative_email TEXT,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'judge',
        role_title TEXT,
        organization TEXT,
        event_designation TEXT,
        specialisation TEXT,
        photo TEXT,
        initials TEXT,
        color TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS startups (
        id INT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        founder TEXT,
        category TEXT,
        metrics JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        judge_id TEXT NOT NULL,
        judge_name TEXT NOT NULL,
        startup_id INT NOT NULL,
        scores JSONB NOT NULL,
        total NUMERIC(5, 2) NOT NULL,
        remarks TEXT DEFAULT '',
        status TEXT DEFAULT 'submitted',
        edit_history JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(judge_id, startup_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 2. Seed Judges if empty
    const existingJudges = await sql`SELECT COUNT(*)::int as count FROM judges`;
    if (existingJudges[0].count === 0) {
      const judgesPath = path.join(process.cwd(), 'data', 'judges.json');
      if (fs.existsSync(judgesPath)) {
        const judges = JSON.parse(fs.readFileSync(judgesPath, 'utf-8'));
        for (const j of judges) {
          await sql`
            INSERT INTO judges (
              id, name, email, alternative_email, password, role,
              role_title, organization, event_designation, specialisation,
              photo, initials, color
            ) VALUES (
              ${j.id}, ${j.name}, ${j.email}, ${j.alternativeEmail || null}, ${j.password}, ${j.role || 'judge'},
              ${j.roleTitle || null}, ${j.organization || null}, ${j.eventDesignation || 'Panelist'}, ${j.specialisation || null},
              ${j.photo || null}, ${j.initials || 'J'}, ${j.color || '#899878'}
            )
            ON CONFLICT (id) DO NOTHING;
          `;
        }
      }
    }

    // 3. Seed Startups if empty
    const existingStartups = await sql`SELECT COUNT(*)::int as count FROM startups`;
    if (existingStartups[0].count === 0) {
      const startupsPath = path.join(process.cwd(), 'data', 'startups.json');
      if (fs.existsSync(startupsPath)) {
        const startups = JSON.parse(fs.readFileSync(startupsPath, 'utf-8'));
        for (const s of startups) {
          await sql`
            INSERT INTO startups (id, name, description, founder, category, metrics)
            VALUES (${s.id}, ${s.name}, ${s.description}, ${s.founder}, ${s.category}, ${JSON.stringify(s.metrics || {})})
            ON CONFLICT (id) DO NOTHING;
          `;
        }
      }
    }

    // 4. Seed Settings if missing
    await sql`
      INSERT INTO settings (key, value)
      VALUES ('scoring_locked', 'false'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `;

    return { initialized: true, success: true };
  } catch (error) {
    console.error('Neon DB Initialization Error:', error);
    throw error;
  }
}
