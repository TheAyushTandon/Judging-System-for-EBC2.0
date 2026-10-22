import { NextResponse } from 'next/server';
import { getLeaderboard, getJudgeProgress, setScoringLocked, isScoringLocked, clearScores } from '@/lib/data';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leaderboard = await getLeaderboard();
  const progress = await getJudgeProgress();
  const locked = await isScoringLocked();

  return NextResponse.json({ leaderboard, progress, locked });
}

export async function POST(request) {
  const user = requireAuth(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { action } = await request.json();
  if (action === 'lock') {
    await setScoringLocked(true);
    return NextResponse.json({ success: true, locked: true });
  }
  if (action === 'unlock') {
    await setScoringLocked(false);
    return NextResponse.json({ success: true, locked: false });
  }
  if (action === 'reset') {
    await clearScores();
    return NextResponse.json({ success: true, message: 'Scores reset' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
