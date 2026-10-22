import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Read .env.local manually for the script
const envLocalPath = path.join(process.cwd(), '.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) {
    databaseUrl = match[1];
  }
}

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not found in environment or .env.local');
  process.exit(1);
}

console.log('Connecting to Neon Postgres with host:', new URL(databaseUrl.replace(/^postgresql:\/\//, 'http://')).hostname);

const sql = neon(databaseUrl);

async function main() {
  console.log('1. Testing raw connection: SELECT 1 as connected...');
  const res = await sql`SELECT 1 as connected, version() as version;`;
  console.log('Connected successfully! Postgres version:', res[0].version);

  console.log('2. Creating tables...');
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
  console.log('Tables created or already present!');

  console.log('3. Seeding judges from data/judges.json...');
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
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          alternative_email = EXCLUDED.alternative_email,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          role_title = EXCLUDED.role_title,
          organization = EXCLUDED.organization,
          event_designation = EXCLUDED.event_designation,
          specialisation = EXCLUDED.specialisation,
          photo = EXCLUDED.photo,
          initials = EXCLUDED.initials,
          color = EXCLUDED.color;
      `;
    }
    console.log(`Seeded/Updated ${judges.length} judges.`);
  }

  console.log('4. Seeding startups from data/startups.json...');
  const startupsPath = path.join(process.cwd(), 'data', 'startups.json');
  if (fs.existsSync(startupsPath)) {
    const startups = JSON.parse(fs.readFileSync(startupsPath, 'utf-8'));
    for (const s of startups) {
      await sql`
        INSERT INTO startups (id, name, description, founder, category, metrics)
        VALUES (${s.id}, ${s.name}, ${s.description}, ${s.founder}, ${s.category}, ${JSON.stringify(s.metrics || {})})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          founder = EXCLUDED.founder,
          category = EXCLUDED.category,
          metrics = EXCLUDED.metrics;
      `;
    }
    console.log(`Seeded/Updated ${startups.length} startups.`);
  }

  console.log('5. Seeding settings...');
  await sql`
    INSERT INTO settings (key, value)
    VALUES ('scoring_locked', 'false'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  `;

  console.log('6. Verifying database records...');
  const [judgeCount] = await sql`SELECT COUNT(*)::int as count FROM judges`;
  const [startupCount] = await sql`SELECT COUNT(*)::int as count FROM startups`;
  const [scoreCount] = await sql`SELECT COUNT(*)::int as count FROM scores`;
  const settingsRows = await sql`SELECT * FROM settings`;

  console.log('Verification Results:');
  console.log(`  Judges in DB:    ${judgeCount.count}`);
  console.log(`  Startups in DB:  ${startupCount.count}`);
  console.log(`  Scores in DB:    ${scoreCount.count}`);
  console.log(`  Settings in DB:  ${JSON.stringify(settingsRows)}`);

  console.log('\n--- Sample Judge Record ---');
  const sampleJudge = await sql`SELECT id, name, organization, event_designation, email FROM judges LIMIT 1`;
  console.log(sampleJudge[0]);

  console.log('\n--- Sample Startup Record ---');
  const sampleStartup = await sql`SELECT id, name, category, founder FROM startups LIMIT 1`;
  console.log(sampleStartup[0]);

  console.log('\nSUCCESS: Neon database fully initialized and verified!');
}

main().catch((err) => {
  console.error('Neon Migration Failed:', err);
  process.exit(1);
});
