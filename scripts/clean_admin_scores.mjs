import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/DATABASE_URL="([^"]+)"/)[1];
const sql = neon(url);

const deleted = await sql`DELETE FROM scores WHERE judge_id = 'admin' RETURNING *;`;
console.log('Deleted admin scores:', deleted);

const remaining = await sql`SELECT id, judge_id, judge_name, startup_id, total, remarks FROM scores;`;
console.log('Remaining scores in DB:', remaining);
