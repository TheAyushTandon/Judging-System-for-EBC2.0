import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { authenticateJudge, getStartups, saveScore, getScore, getLeaderboard, getJudgeProgress, clearScores } from '../lib/data.js';

// Load env
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([A-Za-z_0-9]+)=["']?([^"'\r\n]+)["']?/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

console.log('Testing End-to-End Neon Database Integration...\n');

async function testSuite() {
  // Test 1: Authenticate Judge
  console.log('TEST 1: Authenticate Judge (Mr. Maneesh Srivastava)');
  const judge = await authenticateJudge('judge1@ebc.com', 'ebc2025judge1');
  if (!judge || judge.name !== 'Mr. Maneesh Srivastava') {
    throw new Error('Test 1 Failed: Judge authentication failed');
  }
  console.log('  PASSED: Authenticated judge:', judge.name, 'Role:', judge.role);

  // Test 2: Fetch Startups
  console.log('\nTEST 2: Fetch Startups from Neon');
  const startups = await getStartups();
  if (!startups || startups.length !== 20) {
    throw new Error(`Test 2 Failed: Expected 20 startups, got ${startups?.length}`);
  }
  console.log(`  PASSED: Fetched ${startups.length} startups from Neon Postgres.`);

  // Test 3: Submit Score
  console.log('\nTEST 3: Save Score to Neon Postgres');
  const sampleScores = {
    problem_evidence: 8.5,
    feasibility: 9,
    potential_impact: 8,
    fund_utilization: 8.5,
    measurable_change: 9,
  };
  const total = Object.values(sampleScores).reduce((a, b) => a + b, 0);

  const saved = await saveScore({
    judgeId: 'judge1',
    judgeName: 'Mr. Maneesh Srivastava',
    startupId: 1,
    scores: sampleScores,
    total,
    remarks: 'Strong team and solid market proposition. Tested on Neon Postgres.',
  });

  if (!saved || saved.total !== total) {
    throw new Error('Test 3 Failed: Score was not saved properly');
  }
  console.log('  PASSED: Score saved in Neon. Total:', saved.total, 'Remarks:', saved.remarks);

  // Test 4: Retrieve and verify score from Neon
  console.log('\nTEST 4: Retrieve Score from Neon');
  const retrieved = await getScore('judge1', 1);
  if (!retrieved || retrieved.total !== total) {
    throw new Error('Test 4 Failed: Could not retrieve score from Neon');
  }
  console.log('  PASSED: Retrieved score from Neon. Judge:', retrieved.judgeName, 'Startup ID:', retrieved.startupId);

  // Test 5: Edit Score (Verifying Edit History in Neon)
  console.log('\nTEST 5: Edit Score and Check History Tracking');
  const updatedScores = { ...sampleScores, problem_evidence: 9.5 };
  const updatedTotal = Object.values(updatedScores).reduce((a, b) => a + b, 0);

  const edited = await saveScore({
    judgeId: 'judge1',
    judgeName: 'Mr. Maneesh Srivastava',
    startupId: 1,
    scores: updatedScores,
    total: updatedTotal,
    remarks: 'Upgraded market need score from 8 to 9 after re-evaluating.',
  });

  if (!edited || edited.total !== updatedTotal || !edited.editHistory || edited.editHistory.length === 0) {
    throw new Error('Test 5 Failed: Score edit history was not preserved');
  }
  console.log('  PASSED: Score updated in Neon! Previous total preserved in history:', edited.editHistory[0].total, 'New Total:', edited.total);

  // Test 6: Leaderboard and Progress calculation from Neon
  console.log('\nTEST 6: Leaderboard and Judge Progress Calculation');
  const leaderboard = await getLeaderboard();
  const progress = await getJudgeProgress();

  const topStartup = leaderboard.find(s => s.id === 1);
  const judge1Progress = progress.find(p => p.judgeId === 'judge1');

  if (!topStartup || topStartup.numJudgesScored < 1) {
    throw new Error('Test 6 Failed: Leaderboard did not reflect Neon score');
  }
  if (!judge1Progress || judge1Progress.scored !== 1) {
    throw new Error('Test 6 Failed: Progress tracker did not reflect Neon score');
  }
  console.log(`  PASSED: Leaderboard top startup scored: ${topStartup.name} with avg ${topStartup.avgTotal}`);
  console.log(`  PASSED: Judge 1 progress in Neon: ${judge1Progress.scored}/${judge1Progress.total} startups evaluated`);

  // Test 7: Clean up test score
  console.log('\nTEST 7: Reset Scores');
  await clearScores();
  const afterReset = await getScore('judge1', 1);
  if (afterReset !== null) {
    throw new Error('Test 7 Failed: Scores were not cleared');
  }
  console.log('  PASSED: Scores table cleanly reset and ready for real judging event!');

  console.log('\n======================================================');
  console.log(' ALL 7 NEON POSTGRES END-TO-END TESTS PASSED (100%) ');
  console.log('======================================================');
}

testSuite().catch(err => {
  console.error('\nE2E Test Suite Error:', err);
  process.exit(1);
});
