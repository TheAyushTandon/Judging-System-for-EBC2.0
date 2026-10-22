export const METRICS = [
  {
    key: 'market_need',
    label: 'Market Need',
    description: 'Is there a need for this Idea? Market size, what market gap is it filling, does it solve a real-world problem?',
    icon: 'market_need',
    maxScore: 10,
  },
  {
    key: 'feasibility',
    label: 'Feasibility',
    description: 'Feasibility and reasonability of the technical claims, methodology used/to be used for PoC and validation, roadmap for product development.',
    icon: 'feasibility',
    maxScore: 10,
  },
  {
    key: 'potential_impact',
    label: 'Potential Impact',
    description: 'Customer demographic & the technology\'s effect on these, national importance (if any).',
    icon: 'potential_impact',
    maxScore: 10,
  },
  {
    key: 'novelty',
    label: 'Novelty',
    description: 'USP of the technology, associated IP.',
    icon: 'novelty',
    maxScore: 10,
  },
  {
    key: 'team',
    label: 'Team',
    description: 'Strength of the team, Technical and business expertise.',
    icon: 'team',
    maxScore: 10,
  },
  {
    key: 'fund_utilization',
    label: 'Fund Utilization',
    description: 'Roadmap of money utilization.',
    icon: 'fund_utilization',
    maxScore: 10,
  },
  {
    key: 'presentation',
    label: 'Presentation',
    description: 'Overall assessment of the pitch.',
    icon: 'presentation',
    maxScore: 10,
  },
  {
    key: 'target_audience',
    label: 'Target Audience',
    description: 'Age group and other demographics of the target customer base.',
    icon: 'target_audience',
    maxScore: 10,
  },
  {
    key: 'pricing_strategy',
    label: 'Pricing Strategy',
    description: 'Is it a premium or low-cost offering? Pricing rationale.',
    icon: 'pricing_strategy',
    maxScore: 10,
  },
  {
    key: 'competition_usp',
    label: 'Competition & USP',
    description: 'USP compared with competitors and existing offerings.',
    icon: 'competition_usp',
    maxScore: 10,
  },
];

export const MAX_TOTAL = METRICS.reduce((sum, m) => sum + m.maxScore, 0); // 110

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
  if (ratio >= 0.8) return '#536848'; // deep rich palm-leaf
  if (ratio >= 0.6) return '#899878'; // palm-leaf
  if (ratio >= 0.4) return '#948a52'; // muted olive ochre
  return '#8a5046'; // muted terracotta
}
