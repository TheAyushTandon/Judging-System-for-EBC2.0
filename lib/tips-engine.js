const TIPS = {
  market_need: {
    low: [
      'Conduct deeper market research with surveys, interviews, and competitor analysis.',
      'Define and quantify your Total Addressable Market (TAM), Serviceable Available Market (SAM), and Serviceable Obtainable Market (SOM).',
      'Clearly articulate the specific pain point your solution addresses with real-world examples.',
    ],
    mid: [
      'Strengthen your market validation with customer testimonials or pilot user data.',
      'Consider narrowing your initial target segment for stronger product-market fit.',
      'Show evidence of growing market demand through trends or data.',
    ],
    high: [
      'Excellent market understanding! Consider expanding to adjacent markets.',
      'Document your market insights as a competitive moat.',
    ],
  },
  feasibility: {
    low: [
      'Develop a clear technical roadmap with milestones and timelines.',
      'Build a Minimum Viable Product (MVP) to validate core technical assumptions.',
      'Consider partnering with technical experts or advisors to strengthen feasibility.',
    ],
    mid: [
      'Provide more concrete evidence of technical validation (prototypes, benchmarks).',
      'Address potential technical risks and your mitigation strategies.',
      'Document your technology stack choices and justify them.',
    ],
    high: [
      'Strong technical foundation! Consider filing patents for novel technical approaches.',
      'Document your technical architecture for future investors.',
    ],
  },
  potential_impact: {
    low: [
      'Quantify the potential impact with specific metrics (lives affected, cost savings, efficiency gains).',
      'Identify and articulate any social or environmental impact alongside economic value.',
      'Research if your solution addresses any national priority areas or government initiatives.',
    ],
    mid: [
      'Strengthen impact claims with case studies or comparable solutions in other markets.',
      'Consider partnerships with NGOs or government bodies for wider impact.',
      'Develop measurable impact KPIs to track progress.',
    ],
    high: [
      'Impressive potential impact! Consider applying for social enterprise grants.',
      'Document your impact thesis for ESG-focused investors.',
    ],
  },
  novelty: {
    low: [
      'Clearly differentiate your solution from existing alternatives.',
      'Identify and protect unique intellectual property (patents, trade secrets, proprietary data).',
      'Innovate on business model even if the technology is not entirely novel.',
    ],
    mid: [
      'File provisional patents for novel aspects of your technology.',
      'Build defensible competitive advantages beyond just technology (network effects, data moats).',
      'Conduct a thorough prior art search to validate novelty claims.',
    ],
    high: [
      'Outstanding innovation! Ensure strong IP protection strategy.',
      'Consider licensing opportunities for your novel technology.',
    ],
  },
  team: {
    low: [
      'Identify and fill critical skill gaps in your founding team.',
      'Bring on advisors with domain expertise and industry connections.',
      'Demonstrate relevant experience or transferable skills of team members.',
    ],
    mid: [
      'Highlight complementary skills across team members.',
      'Show track record of execution (previous projects, achievements).',
      'Plan for key hires in the next 6-12 months.',
    ],
    high: [
      'Strong team composition! Consider building an advisory board for strategic guidance.',
      'Document team achievements and credentials for investor materials.',
    ],
  },
  fund_utilization: {
    low: [
      'Create a detailed month-by-month budget breakdown for the next 12-18 months.',
      'Justify major expenditures with expected ROI or milestones.',
      'Show financial projections with clear assumptions and sensitivity analysis.',
    ],
    mid: [
      'Align fund allocation with key product and business milestones.',
      'Include contingency planning for different growth scenarios.',
      'Show unit economics and path to profitability.',
    ],
    high: [
      'Well-planned fund utilization! Consider multiple funding scenarios.',
      'Document burn rate and runway calculations.',
    ],
  },
  presentation: {
    low: [
      'Practice your pitch extensively — aim for clarity and confidence.',
      'Structure your pitch: Problem → Solution → Market → Traction → Team → Ask.',
      'Use visual aids (demos, prototypes) to make your pitch more engaging.',
    ],
    mid: [
      'Work on storytelling — lead with a compelling narrative.',
      'Prepare for tough Q&A scenarios with data-backed responses.',
      'Time management — ensure key points are covered within allocated time.',
    ],
    high: [
      'Excellent presentation skills! Consider mentoring other startups.',
      'Your pitch style is a competitive advantage — maintain it.',
    ],
  },
  target_audience: {
    low: [
      'Create detailed customer personas with demographics, psychographics, and behaviors.',
      'Validate target audience assumptions with actual customer interviews.',
      'Consider whether your initial target audience is too broad or too narrow.',
    ],
    mid: [
      'Show evidence of customer acquisition in your target demographic.',
      'Analyze customer lifetime value and acquisition cost for your target audience.',
      'Consider secondary target audiences for future expansion.',
    ],
    high: [
      'Strong audience understanding! Use this for precision marketing.',
      'Consider building community-driven growth strategies.',
    ],
  },
  pricing_strategy: {
    low: [
      'Research competitor pricing models and position accordingly.',
      'Conduct willingness-to-pay surveys with your target audience.',
      'Consider value-based pricing rather than cost-plus pricing.',
    ],
    mid: [
      'Test different pricing tiers or models (freemium, subscription, pay-per-use).',
      'Show how pricing supports your growth strategy and unit economics.',
      'Plan for pricing evolution as you scale.',
    ],
    high: [
      'Well-thought-out pricing! Consider dynamic pricing strategies.',
      'Document your pricing model\'s competitive advantages.',
    ],
  },
  competition_usp: {
    low: [
      'Create a detailed competitive landscape analysis (feature comparison matrix).',
      'Articulate your USP in one clear sentence that anyone can understand.',
      'Identify sustainable competitive advantages (not easily replicated).',
    ],
    mid: [
      'Build and communicate a clear positioning strategy.',
      'Monitor competitor moves and adapt your strategy accordingly.',
      'Develop multiple competitive moats (technology, brand, network effects).',
    ],
    high: [
      'Clear competitive advantage! Ensure it\'s sustainable long-term.',
      'Consider how to build additional moats as you grow.',
    ],
  },
};

export function generateTips(metricKey, avgScore) {
  const metricTips = TIPS[metricKey];
  if (!metricTips) return [];

  if (avgScore <= 4) return metricTips.low;
  if (avgScore <= 7) return metricTips.mid;
  return metricTips.high;
}

export function generateOverallSummary(scores) {
  const total = Object.values(scores).reduce((sum, s) => sum + s, 0);
  const avg = total / Object.keys(scores).length;

  if (avg >= 8) return '🌟 Outstanding performance across all metrics. This startup demonstrates exceptional potential and readiness for investment.';
  if (avg >= 6) return '👍 Solid performance with room for improvement in specific areas. Focus on the highlighted recommendations to strengthen your pitch.';
  if (avg >= 4) return '⚠️ Several areas need significant improvement. Focus on the fundamentals — market validation, team building, and technical feasibility.';
  return '🔄 This startup needs substantial development across multiple areas. Consider pivoting or strengthening core assumptions before the next evaluation.';
}
