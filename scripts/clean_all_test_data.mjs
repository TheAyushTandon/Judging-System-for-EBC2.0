import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/DATABASE_URL="([^"]+)"/)[1];
const sql = neon(url);

console.log('1. Clearing all scores from Neon Postgres...');
const deletedScores = await sql`DELETE FROM scores RETURNING id, judge_name, startup_id;`;
console.log(`Deleted ${deletedScores.length} score records from Neon.`);

console.log('2. Resetting scoring_locked setting to false...');
await sql`
  INSERT INTO settings (key, value, updated_at)
  VALUES ('scoring_locked', 'false'::jsonb, NOW())
  ON CONFLICT (key) DO UPDATE SET value = 'false'::jsonb, updated_at = NOW();
`;

console.log('3. Resetting local data/scores.json...');
const scoresJsonPath = path.join(process.cwd(), 'data', 'scores.json');
fs.writeFileSync(scoresJsonPath, '[]\n', 'utf-8');

console.log('4. Verifying clean state...');
const [scoreCount] = await sql`SELECT COUNT(*)::int as count FROM scores;`;
const [judgeCount] = await sql`SELECT COUNT(*)::int as count FROM judges;`;
const [startupCount] = await sql`SELECT COUNT(*)::int as count FROM startups;`;
const settings = await sql`SELECT * FROM settings;`;

console.log('\n--- VERIFICATION RESULT ---');
console.log(`Scores in DB:    ${scoreCount.count} (CLEAN)`);
console.log(`Judges in DB:    ${judgeCount.count} (READY)`);
console.log(`Startups in DB:  ${startupCount.count} (READY)`);
console.log('Settings in DB:', settings);
console.log('\nDATABASE CLEANED AND READY FOR LIVE EVENT!');
