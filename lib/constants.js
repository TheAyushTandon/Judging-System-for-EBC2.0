export const METRICS = [
  {
    key: 'problem_evidence',
    label: 'Problem and Evidence of Need',
    description: 'What issue does this idea aim to solve, who are the intended users or beneficiaries, and what proof exists that the issue is significant and not sufficiently addressed by current solutions.',
    icon: 'problem_evidence',
    maxScore: 10,
  },
  {
    key: 'feasibility',
    label: 'Feasibility',
    description: 'How are people currently addressing this problem, what meaningful advantage does your USP offer over existing alternatives, and why would your intended users choose it over their current approach.',
    icon: 'feasibility',
    maxScore: 10,
  },
  {
    key: 'potential_impact',
    label: 'Potential Impact',
    description: 'What evidence demonstrates that your team has the skills and commitment to execute this idea, how will you address gaps in capability, and what three measurable milestones can you realistically achieve for the next three months.',
    icon: 'potential_impact',
    maxScore: 10,
  },
  {
    key: 'fund_utilization',
    label: 'Fund Utilization Plan',
    description: 'Roadmap of money utilization.',
    icon: 'fund_utilization',
    maxScore: 10,
  },
  {
    key: 'measurable_change',
    label: 'Measurable Positive Change',
    description: 'What measurable positive change do you expect your solution to create for its users or beneficiaries, how will you establish a baseline and verify that change, and how will you address relevant accessibility barriers or unintended negative effects.',
    icon: 'measurable_change',
    maxScore: 10,
  },
];

export const MAX_TOTAL = METRICS.reduce((sum, m) => sum + m.maxScore, 0); // 50

export const SCORE_STEPS = 0.5;

export const SCORE_LABELS = {
  0: 'Not Rated',
  1: 'Poor',
  2: 'Poor',
  3: 'Below Average',
  4: 'Below Average',
  5: 'Average',
  6: 'Average',
  7: 'Good',
  8: 'Good',
  9: 'Excellent',
  10: 'Outstanding',
};

export function getScoreColor(score, max = 10) {
  const ratio = score / max;
  if (ratio >= 0.8) return 'var(--palm-leaf)'; // #899878
  if (ratio >= 0.6) return 'var(--accent-hover)'; // #6e7d5e
  if (ratio >= 0.4) return '#c49a45'; // warm amber
  return '#b05040'; // soft rust/terracotta
}
