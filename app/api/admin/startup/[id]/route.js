import { NextResponse } from 'next/server';
import { getScoresByStartup, getStartupById, getJudges } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import { generateTips, generateOverallSummary } from '@/lib/tips-engine';
import { METRICS } from '@/lib/constants';

export async function GET(request, { params }) {
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const startup = await getStartupById(id);
    if (!startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    const rawScores = await getScoresByStartup(id);
    const allJudges = await getJudges();
    const judgeIdSet = new Set(allJudges.filter((j) => j.role === 'judge').map((j) => j.id));
    const allScores = rawScores.filter((s) => judgeIdSet.has(s.judgeId));

    // Calculate averages per metric
    const metricAverages = {};
    const metricBreakdown = {};

    METRICS.forEach((metric) => {
      const values = allScores
        .map((s) => s.scores?.[metric.key] || 0)
        .filter((v) => v > 0);

      const avg = values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : 0;

      metricAverages[metric.key] = avg;
      metricBreakdown[metric.key] = {
        average: avg,
        scores: allScores.map((s) => {
          const j = allJudges.find((judge) => judge.id === s.judgeId);
          return {
            judgeId: s.judgeId,
            judgeName: j?.name || s.judgeName,
            score: s.scores?.[metric.key] || 0,
          };
        }),
        tips: generateTips(metric.key, avg),
        // Standard deviation for consensus indicator
        stdDev: values.length > 1
          ? Math.round(
              Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length) * 10
            ) / 10
          : 0,
      };
    });

    const avgTotal = Object.values(metricAverages).reduce((a, b) => a + b, 0);
    const overallSummary = generateOverallSummary(metricAverages);

    // Collect all remarks
    const remarks = allScores
      .filter((s) => s.remarks && s.remarks.trim())
      .map((s) => {
        const j = allJudges.find((judge) => judge.id === s.judgeId);
        return {
          judgeId: s.judgeId,
          judgeName: j?.name || s.judgeName,
          remark: s.remarks,
        };
      });

    return NextResponse.json(
      {
        startup,
        metricAverages,
        metricBreakdown,
        avgTotal: Math.round(avgTotal * 10) / 10,
        overallSummary,
        remarks,
        totalJudgesScored: allScores.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Startup report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
