import { NextResponse } from 'next/server';
import { getScoresByJudge, saveScore, getScore, isScoringLocked } from '@/lib/data';
import { requireAuth } from '@/lib/auth';


export async function GET(request) {
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const judgeId = searchParams.get('judgeId') || user.id;
  const startupId = searchParams.get('startupId');

  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (startupId) {
    const score = await getScore(judgeId, startupId);
    return NextResponse.json({ score }, { headers });
  }

  const scores = await getScoresByJudge(judgeId);
  return NextResponse.json({ scores }, { headers });
}

export async function POST(request) {
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'judge') {
    return NextResponse.json({ error: 'Only judges can submit scores' }, { status: 403 });
  }

  if (await isScoringLocked()) {
    return NextResponse.json({ error: 'Scoring has been locked by the admin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { startupId, scores, remarks } = body;

    if (!startupId || !scores) {
      return NextResponse.json(
        { error: 'startupId and scores are required' },
        { status: 400 }
      );
    }

    // Calculate total
    const total = Object.values(scores).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

    const savedScore = await saveScore({
      judgeId: user.id,
      judgeName: user.name,
      startupId: parseInt(startupId),
      scores,
      total: Math.round(total * 10) / 10,
      remarks: remarks || '',
    });

    return NextResponse.json({ success: true, score: savedScore });
  } catch (error) {
    console.error('Score save error:', error);
    return NextResponse.json(
      { error: 'Failed to save scores' },
      { status: 500 }
    );
  }
}
