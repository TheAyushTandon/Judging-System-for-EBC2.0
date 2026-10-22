import { NextResponse } from 'next/server';
import { getLeaderboard, getJudgeProgress, setScoringLocked, isScoringLocked, clearScores } from '@/lib/data';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leaderboard = getLeaderboard();
  const progress = getJudgeProgress();
  const locked = isScoringLocked();

  return NextResponse.json({ leaderboard, progress, locked });
}

export async function POST(request) {
  const user = requireAuth(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { action } = await request.json();
  if (action === 'lock') {
    setScoringLocked(true);
    return NextResponse.json({ success: true, locked: true });
  }
  if (action === 'unlock') {
    setScoringLocked(false);
    return NextResponse.json({ success: true, locked: false });
  }
  if (action === 'reset') {
    clearScores();
    return NextResponse.json({ success: true, message: 'Scores reset' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
