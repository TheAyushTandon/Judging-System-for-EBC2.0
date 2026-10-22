import fs from 'fs';
import path from 'path';
import { getDb, isNeonConfigured, initDatabase } from './db.js';
import { METRICS } from './constants.js';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Database mappers ──
function mapJudge(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    alternativeEmail: row.alternative_email || '',
    password: row.password,
    role: row.role || 'judge',
    roleTitle: row.role_title || '',
    organization: row.organization || '',
    eventDesignation: row.event_designation || 'Panelist',
    specialisation: row.specialisation || '',
    photo: row.photo || null,
    initials: row.initials || 'J',
    color: row.color || '#899878',
  };
}

function mapStartup(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    founder: row.founder,
    category: row.category,
    metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : (row.metrics || {}),
  };
}

function mapScore(row) {
  if (!row) return null;
  return {
    judgeId: row.judge_id,
    judgeName: row.judge_name,
    startupId: parseInt(row.startup_id),
    scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : (row.scores || {}),
    total: parseFloat(row.total),
    remarks: row.remarks || '',
    status: row.status || 'submitted',
    editHistory: typeof row.edit_history === 'string' ? JSON.parse(row.edit_history) : (row.edit_history || []),
    timestamp: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

// Ensure database schema is initialized once on first call if Neon is active
let initPromise = null;
async function ensureDbInit() {
  if (!isNeonConfigured()) return false;
  if (!initPromise) {
    initPromise = initDatabase().catch((err) => {
      console.error('Failed to auto-init Neon DB:', err);
      initPromise = null;
      return false;
    });
  }
  return initPromise;
}

// ── Judges ──
export async function getJudges() {
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const rows = await sql`SELECT * FROM judges ORDER BY id ASC`;
      if (rows && rows.length > 0) {
        return rows.map(mapJudge);
      }
    } catch (err) {
      console.warn('Neon query error in getJudges, using fallback:', err.message);
    }
  }
  return readJSON('judges.json');
}

export async function getJudgeById(id) {
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const rows = await sql`SELECT * FROM judges WHERE id = ${id}`;
      if (rows && rows.length > 0) {
        return mapJudge(rows[0]);
      }
      return null;
    } catch (err) {
      console.warn('Neon query error in getJudgeById, using fallback:', err.message);
    }
  }
  const judges = readJSON('judges.json');
  return judges.find((j) => j.id === id) || null;
}

export async function authenticateJudge(email, password) {
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const rows = await sql`
        SELECT * FROM judges 
        WHERE (LOWER(email) = LOWER(${email}) OR LOWER(alternative_email) = LOWER(${email}))
          AND password = ${password}
        LIMIT 1
      `;
      if (rows && rows.length > 0) {
        const judge = mapJudge(rows[0]);
        const { password: _, ...safeJudge } = judge;
        return safeJudge;
      }
      return null;
    } catch (err) {
      console.warn('Neon query error in authenticateJudge, using fallback:', err.message);
    }
  }

  const judges = readJSON('judges.json');
  const judge = judges.find(
    (j) =>
      (j.email.toLowerCase() === email.toLowerCase() ||
        (j.alternativeEmail && j.alternativeEmail.toLowerCase() === email.toLowerCase())) &&
      j.password === password
  );
  if (!judge) return null;
  const { password: _, ...safeJudge } = judge;
  return safeJudge;
}

// ── Startups ──
export async function getStartups() {
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const rows = await sql`SELECT * FROM startups ORDER BY id ASC`;
      if (rows && rows.length > 0) {
        return rows.map(mapStartup);
      }
    } catch (err) {
      console.warn('Neon query error in getStartups, using fallback:', err.message);
    }
  }
  return readJSON('startups.json');
}

export async function getStartupById(id) {
  const numericId = parseInt(id);
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const rows = await sql`SELECT * FROM startups WHERE id = ${numericId} LIMIT 1`;
      if (rows && rows.length > 0) {
        return mapStartup(rows[0]);
      }
      return null;
    } catch (err) {
      console.warn('Neon query error in getStartupById, using fallback:', err.message);
    }
  }
  const startups = readJSON('startups.json');
  return startups.find((s) => s.id === numericId) || null;
}

// ── Scores ──
export async function getScores() {
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const rows = await sql`SELECT * FROM scores ORDER BY updated_at DESC`;
      return rows.map(mapScore);
    } catch (err) {
      console.warn('Neon query error in getScores, using fallback:', err.message);
    }
  }
  return readJSON('scores.json');
}

export async function getScoresByJudge(judgeId) {
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const rows = await sql`SELECT * FROM scores WHERE judge_id = ${judgeId} ORDER BY updated_at DESC`;
      return rows.map(mapScore);
    } catch (err) {
      console.warn('Neon query error in getScoresByJudge, using fallback:', err.message);
    }
  }
  const scores = readJSON('scores.json');
  return scores.filter((s) => s.judgeId === judgeId);
}

export async function getScoresByStartup(startupId) {
  const numericId = parseInt(startupId);
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const rows = await sql`SELECT * FROM scores WHERE startup_id = ${numericId} ORDER BY updated_at DESC`;
      return rows.map(mapScore);
    } catch (err) {
      console.warn('Neon query error in getScoresByStartup, using fallback:', err.message);
    }
  }
  const scores = readJSON('scores.json');
  return scores.filter((s) => s.startupId === numericId);
}

export async function getScore(judgeId, startupId) {
  const numericId = parseInt(startupId);
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const rows = await sql`SELECT * FROM scores WHERE judge_id = ${judgeId} AND startup_id = ${numericId} LIMIT 1`;
      if (rows && rows.length > 0) {
        return mapScore(rows[0]);
      }
      return null;
    } catch (err) {
      console.warn('Neon query error in getScore, using fallback:', err.message);
    }
  }
  const scores = readJSON('scores.json');
  return scores.find((s) => s.judgeId === judgeId && s.startupId === numericId) || null;
}

export async function saveScore(scoreData) {
  const startupId = parseInt(scoreData.startupId);
  const total = parseFloat(scoreData.total);

  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();

      // Check for previous score to maintain editHistory
      const existing = await sql`SELECT * FROM scores WHERE judge_id = ${scoreData.judgeId} AND startup_id = ${startupId}`;
      let editHistory = [];
      if (existing.length > 0) {
        const prev = existing[0];
        const prevHist = typeof prev.edit_history === 'string' ? JSON.parse(prev.edit_history) : (prev.edit_history || []);
        editHistory = [
          ...prevHist,
          {
            scores: typeof prev.scores === 'string' ? JSON.parse(prev.scores) : prev.scores,
            total: parseFloat(prev.total),
            remarks: prev.remarks || '',
            editedAt: new Date().toISOString(),
          },
        ];
      }

      const rows = await sql`
        INSERT INTO scores (
          judge_id, judge_name, startup_id, scores, total, remarks, status, edit_history, updated_at
        ) VALUES (
          ${scoreData.judgeId},
          ${scoreData.judgeName},
          ${startupId},
          ${JSON.stringify(scoreData.scores)},
          ${total},
          ${scoreData.remarks || ''},
          'submitted',
          ${JSON.stringify(editHistory)},
          NOW()
        )
        ON CONFLICT (judge_id, startup_id) DO UPDATE SET
          judge_name = EXCLUDED.judge_name,
          scores = EXCLUDED.scores,
          total = EXCLUDED.total,
          remarks = EXCLUDED.remarks,
          status = EXCLUDED.status,
          edit_history = EXCLUDED.edit_history,
          updated_at = NOW()
        RETURNING *;
      `;
      return mapScore(rows[0]);
    } catch (err) {
      console.warn('Neon query error in saveScore, falling back to JSON:', err.message);
    }
  }

  // Local JSON fallback
  const scores = readJSON('scores.json');
  const existing = scores.findIndex(
    (s) => s.judgeId === scoreData.judgeId && s.startupId === startupId
  );

  const entry = {
    ...scoreData,
    startupId,
    total,
    timestamp: new Date().toISOString(),
    status: 'submitted',
  };

  if (existing !== -1) {
    const prev = scores[existing];
    const prevHistory = Array.isArray(prev.editHistory) ? prev.editHistory : [];
    const historyEntry = {
      scores: prev.scores,
      total: prev.total,
      remarks: prev.remarks || '',
      editedAt: new Date().toISOString(),
    };

    scores[existing] = {
      ...prev,
      ...entry,
      editHistory: [...prevHistory, historyEntry],
    };
  } else {
    scores.push(entry);
  }

  writeJSON('scores.json', scores);
  return scores[existing !== -1 ? existing : scores.length - 1];
}

// ── Cumulative / Leaderboard ──
export async function getLeaderboard() {
  const scores = await getScores();
  const startups = await getStartups();
  const allJudges = await getJudges();
  const judges = allJudges.filter((j) => j.role === 'judge');

  return startups
    .map((startup) => {
      const startupScores = scores.filter((s) => s.startupId === startup.id);
      const numJudgesScored = startupScores.length;

      const metricKeys = METRICS.map((m) => m.key);

      const metricAverages = {};
      metricKeys.forEach((key) => {
        const vals = startupScores.map((s) => s.scores?.[key] || 0).filter((v) => v > 0);
        metricAverages[key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });

      const avgTotal = Object.values(metricAverages).reduce((a, b) => a + b, 0);

      return {
        ...startup,
        numJudgesScored,
        totalJudges: judges.length,
        metricAverages,
        avgTotal: Math.round(avgTotal * 10) / 10,
        allScores: startupScores,
      };
    })
    .sort((a, b) => b.avgTotal - a.avgTotal);
}

// ── Progress ──
export async function getJudgeProgress() {
  const scores = await getScores();
  const allJudges = await getJudges();
  const judges = allJudges.filter((j) => j.role === 'judge');
  const startups = await getStartups();

  return judges.map((judge) => {
    const judgeScores = scores.filter((s) => s.judgeId === judge.id);
    return {
      judgeId: judge.id,
      judgeName: judge.name,
      roleTitle: judge.roleTitle || '',
      organization: judge.organization || '',
      eventDesignation: judge.eventDesignation || 'Panelist',
      photo: judge.photo || null,
      initials: judge.initials || 'J',
      color: judge.color || '#899878',
      scored: judgeScores.length,
      total: startups.length,
      scoredStartups: judgeScores.map((s) => s.startupId),
    };
  });
}

// ── Lock/Unlock & Admin ──
let fallbackScoringLocked = false;

export async function isScoringLocked() {
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      const res = await sql`SELECT value FROM settings WHERE key = 'scoring_locked'`;
      if (res && res.length > 0) {
        return Boolean(res[0].value);
      }
    } catch (err) {
      console.warn('Neon query error in isScoringLocked:', err.message);
    }
  }
  return fallbackScoringLocked;
}

export async function setScoringLocked(locked) {
  fallbackScoringLocked = Boolean(locked);
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      await sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES ('scoring_locked', ${JSON.stringify(locked)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
      `;
    } catch (err) {
      console.warn('Neon query error in setScoringLocked:', err.message);
    }
  }
  return fallbackScoringLocked;
}

export async function clearScores() {
  if (isNeonConfigured()) {
    try {
      await ensureDbInit();
      const sql = getDb();
      await sql`DELETE FROM scores`;
    } catch (err) {
      console.warn('Neon query error in clearScores:', err.message);
    }
  }
  writeJSON('scores.json', []);
  return [];
}
