import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/DATABASE_URL="([^"]+)"/)[1];
const sql = neon(url);

const rows = await sql`SELECT id, judge_id, judge_name, startup_id, total, remarks, edit_history FROM scores`;
console.log(JSON.stringify(rows, null, 2));
