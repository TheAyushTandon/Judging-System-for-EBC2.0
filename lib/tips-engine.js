const TIPS = {
  problem_evidence: {
    low: [
      'Conduct deeper customer discovery interviews to provide documented proof of the pain point.',
      'Quantify the problem severity with specific market data, surveys, and existing alternative shortcomings.',
      'Clearly define your initial beachhead beneficiaries vs broader secondary users.',
    ],
    mid: [
      'Strengthen your proof of need with pilot letters of intent (LOIs) or documented waitlists.',
      'Highlight why current workarounds fail to satisfy this specific target segment.',
      'Demonstrate growing urgency or regulatory/economic tailwinds that make this problem critical now.',
    ],
    high: [
      'Exceptional problem validation! Your evidence and customer intimacy are compelling.',
      'Document these customer insights as an unfair proprietary advantage in investor discussions.',
    ],
  },
  feasibility: {
    low: [
      'Clearly map how users currently solve this issue and why switching to your solution is frictionless.',
      'Highlight concrete technical advantages of your USP rather than incremental features.',
      'Conduct comparative benchmarking against existing alternatives to validate feasibility.',
    ],
    mid: [
      'Provide more concrete evidence of technical validation (PoC results, lab data, user testing).',
      'Address key user adoption barriers and detail how your value proposition overcomes them.',
      'Document your competitive moat against established incumbents.',
    ],
    high: [
      'Compelling feasibility and distinct competitive advantage over all existing approaches!',
      'Ensure strong IP and operational defensibility around your core workflow advantage.',
    ],
  },
  potential_impact: {
    low: [
      'Detail your founding team\'s domain background and specific track record of execution.',
      'Set 3 crisp, measurable, and achievable milestones for the next 90 days.',
      'Outline an active plan to address current capability gaps (advisors, key hires, technical mentors).',
    ],
    mid: [
      'Strengthen execution confidence with weekly sprint roadmaps and validated traction metrics.',
      'Highlight complementary technical and business capabilities within the team.',
      'Clearly assign ownership for each of the 3-month milestone deliverables.',
    ],
    high: [
      'High-conviction execution capability with clear, aggressive yet realistic 90-day milestones!',
      'Showcase your milestone velocity as proof of execution power.',
    ],
  },
  fund_utilization: {
    low: [
      'Create a detailed, milestone-tied budget breakdown showing exactly how the grant/capital is deployed.',
      'Separate R&D, product validation, operational expenses, and pilot acquisition costs.',
      'Ensure your capital runway clearly extends through your 3-month target milestones.',
    ],
    mid: [
      'Tie capital tranches directly to tangible risk reduction and milestone completion.',
      'Include sensitivity analysis and conservative contingency buffers.',
      'Document burn rate and projected unit economics.',
    ],
    high: [
      'Prudent and disciplined capital allocation roadmap with high milestone efficiency!',
      'Keep capital efficiency as a core differentiator in your pitch deck.',
    ],
  },
  measurable_change: {
    low: [
      'Define quantifiable impact baseline metrics (time saved, cost reduced, accuracy gained, accessibility).',
      'Establish a clear verification methodology to measure user outcomes before and after.',
      'Proactively identify accessibility barriers and unintended negative side effects with mitigation plans.',
    ],
    mid: [
      'Conduct formal baseline studies with early test cohorts to document verified positive shift.',
      'Integrate universal design principles to ensure broad accessibility across user demographics.',
      'Create a transparent outcome tracking framework for ongoing impact monitoring.',
    ],
    high: [
      'Outstanding outcome-driven impact model with verified baselines and thoughtful accessibility safeguards!',
      'Highlight your verified outcome metrics as the ultimate proof of long-term value.',
    ],
  },
};

// Fallback aliases
TIPS.market_need = TIPS.problem_evidence;

export function generateTips(metricKey, score) {
  const metricTips = TIPS[metricKey] || TIPS.problem_evidence;
  if (!metricTips) return [];

  if (score < 4) {
    return metricTips.low || [];
  } else if (score < 7.5) {
    return metricTips.mid || [];
  } else {
    return metricTips.high || [];
  }
}

export function generateOverallSummary(metricAverages) {
  const entries = Object.entries(metricAverages);
  if (entries.length === 0) return { strengths: [], improvements: [], summary: '' };

  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const strengths = sorted.slice(0, 2).filter(([, score]) => score > 0);
  const improvements = sorted.slice(-2).reverse().filter(([, score]) => score > 0);

  const total = Object.values(metricAverages).reduce((a, b) => a + b, 0);
  const avg = total / entries.length;

  let summary = '';
  if (avg >= 8) {
    summary = 'Outstanding pitch with high marks across all evaluation criteria. Strong candidate for funding and accelerator support.';
  } else if (avg >= 6) {
    summary = 'Solid pitch with clear potential. Focus on addressing key improvement areas to strengthen the business case.';
  } else if (avg >= 4) {
    summary = 'Shows promise in certain areas but needs significant development before it is ready for investment.';
  } else {
    summary = 'Early-stage concept requiring fundamental validation of need, feasibility, and execution roadmap.';
  }

  return {
    strengths: strengths.map(([key, score]) => ({ key, score })),
    improvements: improvements.map(([key, score]) => ({ key, score })),
    summary,
    avgScore: Math.round(avg * 10) / 10,
  };
}
