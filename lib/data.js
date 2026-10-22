import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Judges ──
export function getJudges() {
  return readJSON('judges.json');
}

export function getJudgeById(id) {
  const judges = getJudges();
  return judges.find((j) => j.id === id) || null;
}

export function authenticateJudge(email, password) {
  const judges = getJudges();
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
export function getStartups() {
  return readJSON('startups.json');
}

export function getStartupById(id) {
  const startups = getStartups();
  return startups.find((s) => s.id === parseInt(id)) || null;
}

// ── Scores ──
export function getScores() {
  return readJSON('scores.json');
}

export function getScoresByJudge(judgeId) {
  const scores = getScores();
  return scores.filter((s) => s.judgeId === judgeId);
}

export function getScoresByStartup(startupId) {
  const scores = getScores();
  return scores.filter((s) => s.startupId === parseInt(startupId));
}

export function getScore(judgeId, startupId) {
  const scores = getScores();
  return scores.find(
    (s) => s.judgeId === judgeId && s.startupId === parseInt(startupId)
  ) || null;
}

export function saveScore(scoreData) {
  const scores = getScores();
  const existing = scores.findIndex(
    (s) => s.judgeId === scoreData.judgeId && s.startupId === scoreData.startupId
  );

  const entry = {
    ...scoreData,
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
export function getLeaderboard() {
  const scores = getScores();
  const startups = getStartups();
  const judges = getJudges().filter((j) => j.role === 'judge');

  return startups.map((startup) => {
    const startupScores = scores.filter((s) => s.startupId === startup.id);
    const numJudgesScored = startupScores.length;

    const metricKeys = [
      'market_need', 'feasibility', 'potential_impact', 'novelty',
      'team', 'fund_utilization', 'additional_params', 'presentation',
      'target_audience', 'pricing_strategy', 'competition_usp'
    ];

    const metricAverages = {};
    metricKeys.forEach((key) => {
      const vals = startupScores.map((s) => s.scores?.[key] || 0).filter(v => v > 0);
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
  }).sort((a, b) => b.avgTotal - a.avgTotal);
}

// ── Progress ──
export function getJudgeProgress() {
  const scores = getScores();
  const judges = getJudges().filter((j) => j.role === 'judge');
  const startups = getStartups();

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

// ── Lock/Unlock ──
let scoringLocked = false;

export function isScoringLocked() {
  return scoringLocked;
}

export function setScoringLocked(locked) {
  scoringLocked = locked;
  return scoringLocked;
}

export function clearScores() {
  writeJSON('scores.json', []);
  return [];
}

