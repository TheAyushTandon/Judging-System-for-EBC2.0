export const METRICS = [
  {
    key: 'problem_market_fit',
    label: 'Problem–Market Fit & Customer Understanding',
    description: 'Problem clarity, market size/gap, target audience and customer demographics',
    icon: 'problem_market_fit',
    maxScore: 10,
  },
  {
    key: 'innovation_usp',
    label: 'Innovation, USP & Competitive Advantage',
    description: 'Novelty, technology differentiation, IP potential, competitors and comparative advantage',
    icon: 'innovation_usp',
    maxScore: 10,
  },
  {
    key: 'technical_feasibility',
    label: 'Technical Feasibility & Execution Roadmap',
    description: 'Technical feasibility, PoC/validation, product development roadmap and fund utilisation plan',
    icon: 'technical_feasibility',
    maxScore: 10,
  },
  {
    key: 'business_model_impact',
    label: 'Business Model, Commercial Viability & Impact',
    description: 'Pricing strategy, revenue potential, scalability, customer value and economic/social impact',
    icon: 'business_model_impact',
    maxScore: 10,
  },
  {
    key: 'team_pitch',
    label: 'Team Strength & Pitch Quality',
    description: 'Founders’ technical/business expertise, team capability, presentation clarity and overall pitch',
    icon: 'team_pitch',
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
  if (ratio >= 0.8) return '#899878'; // 8.0 - 10.0: Outstanding (Palm Leaf)
  if (ratio >= 0.6) return '#5e714d'; // 6.0 - 7.5: Good (Deep Olive Green)
  if (ratio >= 0.4) return '#c49a45'; // 4.0 - 5.5: Average (Warm Amber)
  return '#8a5046'; // < 4.0: Needs Work (Terracotta)
}
