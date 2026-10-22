'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { METRICS, MAX_TOTAL, getScoreColor } from '@/lib/constants';
import StreamlineIcon from '@/components/icons/StreamlineIcons';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState([]);
  const [locked, setLocked] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'leaderboard' | 'compare' | 'judges'
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  // Compare state
  const [compareIdA, setCompareIdA] = useState('');
  const [compareIdB, setCompareIdB] = useState('cohort'); // 'cohort' or startupId

  // Chart canvas refs
  const rankingChartRef = useRef(null);
  const radarChartRef = useRef(null);
  const stackedChartRef = useRef(null);
  const tierChartRef = useRef(null);
  const compareRadarRef = useRef(null);

  const refreshRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem('ebc2_user');
    const token = localStorage.getItem('ebc2_token');

    if (!userData || !token) {
      router.push('/');
      return;
    }

    const parsed = JSON.parse(userData);
    if (parsed.role !== 'admin') {
      router.push('/judge');
      return;
    }
    setUser(parsed);

    fetchData(token);

    // Auto-refresh every 4 seconds to reflect judge updates in real-time
    refreshRef.current = setInterval(() => fetchData(token, false), 4000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData(token, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(refreshRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [router]);

  async function fetchData(token, showToast = false) {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setProgress(data.progress || []);
        setLocked(data.locked || false);
        setLastSynced(new Date());

        // Default comparison IDs if not yet chosen
        if (!compareIdA && data.leaderboard && data.leaderboard.length > 0) {
          setCompareIdA(String(data.leaderboard[0].id));
        }

        if (showToast) addToast('Synced with Neon database');
      }
    } catch (err) {
      if (showToast) addToast('Failed to load data', true);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }

  function addToast(message, isError = false) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  async function toggleLock() {
    const token = localStorage.getItem('ebc2_token');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: locked ? 'unlock' : 'lock' }),
      });
      const data = await res.json();
      setLocked(data.locked);
      addToast(data.locked ? 'Scoring locked 🔒' : 'Scoring unlocked 🔓');
    } catch (err) {
      addToast('Failed to toggle lock', true);
    }
  }

  async function resetScores() {
    if (!window.confirm('Are you sure you want to reset all scores? This will clear all submitted scores from Neon Postgres and cannot be undone.')) {
      return;
    }
    const token = localStorage.getItem('ebc2_token');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (res.ok) {
        addToast('All scores have been reset in Neon Postgres');
        fetchData(token);
      } else {
        addToast('Failed to reset scores', true);
      }
    } catch (err) {
      addToast('Failed to reset scores', true);
    }
  }

  function handleLogout() {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('ebc2_user');
    localStorage.removeItem('ebc2_token');
    router.push('/');
  }

  function exportCSV() {
    if (leaderboard.length === 0) return;

    const headers = [
      'Rank',
      'Startup',
      'Pitch Order',
      'Avg Total (out of 50)',
      ...METRICS.map((m) => `"${m.label} (10)"`),
      'Judges Scored',
      'Total Judges',
    ];

    const rows = leaderboard.map((s, i) => [
      i + 1,
      `"${s.name}"`,
      s.pitchOrder || i + 1,
      s.avgTotal,
      ...METRICS.map((m) => Math.round((s.metricAverages?.[m.key] || 0) * 10) / 10),
      s.numJudgesScored,
      s.totalJudges,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EBC2_Leaderboard_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('CSV exported successfully!');
  }

  // ── Cohort Analytics Calculations ──
  const scoredStartups = leaderboard.filter((s) => s.avgTotal > 0 && s.numJudgesScored > 0);
  const totalStartupsCount = leaderboard.length || 20;
  const scoredCount = scoredStartups.length;
  const evalPercent = totalStartupsCount > 0 ? Math.round((scoredCount / totalStartupsCount) * 100) : 0;

  const topStartup = scoredStartups[0] || null;
  const cohortAvg = scoredCount > 0
    ? Math.round((scoredStartups.reduce((acc, s) => acc + s.avgTotal, 0) / scoredCount) * 10) / 10
    : 0;

  const totalReviewsCount = leaderboard.reduce((acc, s) => acc + (s.numJudgesScored || 0), 0);

  // Cohort metric averages
  const cohortMetricAverages = {};
  METRICS.forEach((m) => {
    const vals = scoredStartups
      .map((s) => s.metricAverages?.[m.key] || 0)
      .filter((v) => v > 0);
    cohortMetricAverages[m.key] = vals.length > 0
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : 0;
  });

  // Top metric
  let bestMetric = null;
  let bestMetricVal = -1;
  METRICS.forEach((m) => {
    const val = cohortMetricAverages[m.key] || 0;
    if (val > bestMetricVal) {
      bestMetricVal = val;
      bestMetric = m;
    }
  });

  // Metric Champions
  const metricChampions = METRICS.map((m) => {
    let champStartup = null;
    let highestScore = 0;
    scoredStartups.forEach((s) => {
      const val = s.metricAverages?.[m.key] || 0;
      if (val > highestScore) {
        highestScore = val;
        champStartup = s;
      }
    });
    return {
      metric: m,
      startup: champStartup,
      score: highestScore,
    };
  });

  // Performance Tiers
  const tierOutstanding = scoredStartups.filter((s) => s.avgTotal >= 40).length;
  const tierStrong = scoredStartups.filter((s) => s.avgTotal >= 30 && s.avgTotal < 40).length;
  const tierDeveloping = scoredStartups.filter((s) => s.avgTotal >= 20 && s.avgTotal < 30).length;
  const tierEarly = scoredStartups.filter((s) => s.avgTotal > 0 && s.avgTotal < 20).length;

  // ── Render Charts with Chart.js ──
  useEffect(() => {
    if (activeTab === 'analytics') {
      renderAnalyticsCharts();
    }
    if (activeTab === 'compare') {
      renderCompareChart();
    }
  }, [activeTab, leaderboard, compareIdA, compareIdB]);

  async function renderAnalyticsCharts() {
    try {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      // 1. Ranking Bar Chart
      if (rankingChartRef.current) {
        const existing = Chart.getChart(rankingChartRef.current);
        if (existing) existing.destroy();

        const displayList = scoredStartups.length > 0 ? scoredStartups.slice(0, 10) : leaderboard.slice(0, 10);
        const labels = displayList.map((s) => s.name);
        const data = displayList.map((s) => s.avgTotal || 0);
        const backgroundColors = displayList.map((_, idx) =>
          idx === 0 ? '#899878' : idx === 1 ? '#a5b395' : idx === 2 ? '#b8bd8f' : '#222725'
        );

        new Chart(rankingChartRef.current, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Score (out of 50)',
                data,
                backgroundColor: backgroundColors,
                borderWidth: 1,
                borderColor: '#121113',
              },
            ],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => ` Total: ${context.parsed.x} / ${MAX_TOTAL} pts`,
                },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                max: MAX_TOTAL,
                grid: { color: 'rgba(34, 39, 37, 0.08)' },
                ticks: { color: '#5a635f', font: { family: 'Inter', size: 11 } },
              },
              y: {
                grid: { display: false },
                ticks: { color: '#121113', font: { family: 'Inter', weight: '600', size: 12 } },
              },
            },
          },
        });
      }

      // 2. Cohort 5-Metric Radar Benchmark
      if (radarChartRef.current) {
        const existing = Chart.getChart(radarChartRef.current);
        if (existing) existing.destroy();

        const labels = METRICS.map((m) => {
          // Shorten label for neat radar display
          return m.label.length > 24 ? m.label.split('&')[0].trim() : m.label;
        });
        const cohortData = METRICS.map((m) => cohortMetricAverages[m.key] || 0);

        new Chart(radarChartRef.current, {
          type: 'radar',
          data: {
            labels,
            datasets: [
              {
                label: 'Cohort Average',
                data: cohortData,
                backgroundColor: 'rgba(137, 152, 120, 0.3)',
                borderColor: '#899878',
                borderWidth: 2,
                pointBackgroundColor: '#222725',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1.5,
                pointRadius: 4,
              },
              {
                label: 'Benchmark Target (8.0/10)',
                data: [8, 8, 8, 8, 8],
                borderColor: 'rgba(138, 80, 70, 0.65)',
                borderWidth: 1.5,
                borderDash: [4, 4],
                pointRadius: 0,
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                beginAtZero: true,
                max: 10,
                ticks: {
                  stepSize: 2,
                  color: '#5a635f',
                  backdropColor: 'transparent',
                  font: { size: 10 },
                },
                grid: { color: 'rgba(34, 39, 37, 0.1)' },
                angleLines: { color: 'rgba(34, 39, 37, 0.1)' },
                pointLabels: {
                  color: '#121113',
                  font: { size: 11, family: 'Inter', weight: '700' },
                },
              },
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12,
                  font: { family: 'Inter', size: 11, weight: '600' },
                  color: '#121113',
                },
              },
            },
          },
        });
      }

      // 3. Stacked Multi-Metric Breakdown (Top 6 Startups)
      if (stackedChartRef.current) {
        const existing = Chart.getChart(stackedChartRef.current);
        if (existing) existing.destroy();

        const topList = (scoredStartups.length > 0 ? scoredStartups : leaderboard).slice(0, 6);
        const labels = topList.map((s) => s.name);

        const metricColors = ['#899878', '#b8bd8f', '#222725', '#c49a45', '#8a5046'];

        const datasets = METRICS.map((m, idx) => ({
          label: m.label.length > 20 ? m.label.slice(0, 20) + '...' : m.label,
          data: topList.map((s) => s.metricAverages?.[m.key] || 0),
          backgroundColor: metricColors[idx % metricColors.length],
          borderWidth: 1,
          borderColor: '#ffffff',
        }));

        new Chart(stackedChartRef.current, {
          type: 'bar',
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                stacked: true,
                grid: { display: false },
                ticks: { color: '#121113', font: { family: 'Inter', weight: '600', size: 11 } },
              },
              y: {
                stacked: true,
                max: MAX_TOTAL,
                grid: { color: 'rgba(34, 39, 37, 0.08)' },
                ticks: { color: '#5a635f', font: { family: 'Inter', size: 11 } },
              },
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12,
                  font: { family: 'Inter', size: 10, weight: '600' },
                  color: '#121113',
                },
              },
              tooltip: {
                mode: 'index',
                intersect: false,
              },
            },
          },
        });
      }

      // 4. Performance Tier Doughnut Chart
      if (tierChartRef.current) {
        const existing = Chart.getChart(tierChartRef.current);
        if (existing) existing.destroy();

        const tierData = [
          tierOutstanding,
          tierStrong,
          tierDeveloping,
          tierEarly,
        ];

        // If no scores yet, fallback visual
        const hasData = tierData.some((v) => v > 0);
        const finalData = hasData ? tierData : [0, 0, 0, totalStartupsCount];
        const finalLabels = hasData
          ? [
              `Tier 1: Outstanding (40-50) [${tierOutstanding}]`,
              `Tier 2: Strong (30-39.9) [${tierStrong}]`,
              `Tier 3: Developing (20-29.9) [${tierDeveloping}]`,
              `Tier 4: Early Stage (<20) [${tierEarly}]`,
            ]
          : [`Pending Evaluation [${totalStartupsCount}]`];

        new Chart(tierChartRef.current, {
          type: 'doughnut',
          data: {
            labels: finalLabels,
            datasets: [
              {
                data: finalData,
                backgroundColor: hasData
                  ? ['#899878', '#a5b395', '#c49a45', '#8a5046']
                  : ['#d5d8b2'],
                borderWidth: 2,
                borderColor: '#ffffff',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '66%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12,
                  font: { family: 'Inter', size: 10, weight: '600' },
                  color: '#121113',
                },
              },
            },
          },
        });
      }
    } catch (err) {
      console.error('Error rendering analytics charts:', err);
    }
  }

  async function renderCompareChart() {
    if (!compareRadarRef.current) return;
    try {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      const existing = Chart.getChart(compareRadarRef.current);
      if (existing) existing.destroy();

      const startupA = leaderboard.find((s) => String(s.id) === String(compareIdA));
      const startupB = compareIdB === 'cohort'
        ? { name: 'Cohort Benchmark', metricAverages: cohortMetricAverages }
        : leaderboard.find((s) => String(s.id) === String(compareIdB));

      if (!startupA) return;

      const labels = METRICS.map((m) => m.label.length > 22 ? m.label.split('&')[0].trim() : m.label);
      const dataA = METRICS.map((m) => startupA.metricAverages?.[m.key] || 0);
      const dataB = METRICS.map((m) => startupB?.metricAverages?.[m.key] || 0);

      new Chart(compareRadarRef.current, {
        type: 'radar',
        data: {
          labels,
          datasets: [
            {
              label: startupA.name,
              data: dataA,
              backgroundColor: 'rgba(137, 152, 120, 0.3)',
              borderColor: '#899878',
              borderWidth: 2,
              pointBackgroundColor: '#899878',
              pointBorderColor: '#ffffff',
              pointRadius: 4,
            },
            {
              label: startupB ? startupB.name : 'Target',
              data: dataB,
              backgroundColor: compareIdB === 'cohort' ? 'rgba(34, 39, 37, 0.15)' : 'rgba(138, 80, 70, 0.25)',
              borderColor: compareIdB === 'cohort' ? '#222725' : '#8a5046',
              borderWidth: 2,
              borderDash: compareIdB === 'cohort' ? [4, 4] : [],
              pointBackgroundColor: compareIdB === 'cohort' ? '#222725' : '#8a5046',
              pointBorderColor: '#ffffff',
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 10,
              ticks: { stepSize: 2, backdropColor: 'transparent', font: { size: 10 } },
              grid: { color: 'rgba(34, 39, 37, 0.1)' },
              angleLines: { color: 'rgba(34, 39, 37, 0.1)' },
              pointLabels: { color: '#121113', font: { family: 'Inter', size: 11, weight: '700' } },
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 12, font: { family: 'Inter', size: 11, weight: '600' } },
            },
          },
        },
      });
    } catch (err) {
      console.error('Error rendering compare chart:', err);
    }
  }

  const filteredLeaderboard = leaderboard.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const startupA = leaderboard.find((s) => String(s.id) === String(compareIdA));
  const startupB = compareIdB === 'cohort'
    ? { name: 'Cohort Benchmark', avgTotal: cohortAvg, metricAverages: cohortMetricAverages }
    : leaderboard.find((s) => String(s.id) === String(compareIdB));

  if (!user || loading) {
    return (
      <div className="login-container">
        <div style={{ color: 'var(--text-secondary)' }}>Loading live data from Neon...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <StreamlineIcon name="trophy" size={20} />
          </div>
          <span className="topbar-title">EBC 2.0 Admin Analytics</span>
        </div>
        <div className="topbar-user">
          <span className="topbar-user-name">Live Evaluation Panel</span>
          <button className="btn-logout" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <StreamlineIcon name="logout" size={13} />
            Logout
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Header with live sync indicator and controls */}
        <div className="admin-header">
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StreamlineIcon name="barChart" size={20} /> Startup Analytics & Evaluation Intelligence
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--palm-leaf)', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)' }} />
                Real-Time Neon Sync (every 4s)
              </span>
              {lastSynced && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  • Last updated {lastSynced.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="admin-actions">
            <button
              className={`btn ${locked ? 'btn-success' : 'btn-danger'} btn-sm`}
              onClick={toggleLock}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <StreamlineIcon name={locked ? 'unlock' : 'lock'} size={14} />
              {locked ? 'Unlock Scoring' : 'Lock Scoring'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <StreamlineIcon name="download" size={14} />
              Export CSV
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchData(localStorage.getItem('ebc2_token'), true)}
              disabled={isRefreshing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <StreamlineIcon name="refresh" size={14} />
              {isRefreshing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={resetScores}
              title="Clear all scores for a new judging round"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <StreamlineIcon name="trash" size={14} />
              Reset All
            </button>
          </div>
        </div>

        {locked && (
          <div className="locked-banner" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <StreamlineIcon name="lock" size={16} />
            Scoring is currently locked. Judges cannot submit or edit scores.
          </div>
        )}

        {/* Executive KPI Ribbon */}
        <div className="admin-kpi-grid">
          {/* Card 1: Evaluation Progress */}
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Evaluated Startups</span>
              <div className="admin-kpi-icon">
                <StreamlineIcon name="check" size={14} />
              </div>
            </div>
            <div className="admin-kpi-value">
              {scoredCount} <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>/ {totalStartupsCount}</span>
            </div>
            <div className="admin-kpi-subtext">
              {evalPercent}% cohort evaluation complete
            </div>
          </div>

          {/* Card 2: Cohort Average */}
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Cohort Mean Score</span>
              <div className="admin-kpi-icon">
                <StreamlineIcon name="trendingUp" size={14} />
              </div>
            </div>
            <div className="admin-kpi-value" style={{ color: cohortAvg > 0 ? getScoreColor(cohortAvg, MAX_TOTAL) : undefined }}>
              {cohortAvg > 0 ? cohortAvg.toFixed(1) : '—'}
              <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}> / {MAX_TOTAL}</span>
            </div>
            <div className="admin-kpi-subtext">
              Across 5 evaluation criteria (10 pts each)
            </div>
          </div>

          {/* Card 3: Current Leader */}
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Current Leader</span>
              <div className="admin-kpi-icon" style={{ background: '#e4e6c3' }}>
                <StreamlineIcon name="trophy" size={14} />
              </div>
            </div>
            <div className="admin-kpi-value" style={{ fontSize: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {topStartup ? topStartup.name : 'Awaiting scores'}
            </div>
            <div className="admin-kpi-subtext">
              {topStartup ? `Avg ${topStartup.avgTotal.toFixed(1)} / ${MAX_TOTAL} (${topStartup.numJudgesScored} judges)` : 'No submissions recorded'}
            </div>
          </div>

          {/* Card 4: Total Reviews */}
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Judge Reviews</span>
              <div className="admin-kpi-icon">
                <StreamlineIcon name="team" size={14} />
              </div>
            </div>
            <div className="admin-kpi-value">
              {totalReviewsCount}
            </div>
            <div className="admin-kpi-subtext">
              Total individual scorecards stored in Neon
            </div>
          </div>

          {/* Card 5: Highest Scoring Dimension */}
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Strongest Dimension</span>
              <div className="admin-kpi-icon">
                <StreamlineIcon name={bestMetric?.key || 'problem_market_fit'} size={14} />
              </div>
            </div>
            <div className="admin-kpi-value" style={{ fontSize: '18px', color: 'var(--palm-leaf)' }}>
              {bestMetricVal > 0 ? `${bestMetricVal.toFixed(1)} / 10` : '—'}
            </div>
            <div className="admin-kpi-subtext" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bestMetric ? bestMetric.label : 'Criteria analysis'}
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="admin-tab-bar">
          <button
            className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <StreamlineIcon name="barChart" size={16} />
            Visual Analytics & Graphs
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <StreamlineIcon name="trophy" size={16} />
            Leaderboard Table ({filteredLeaderboard.length})
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <StreamlineIcon name="sliders" size={16} />
            Head-to-Head Comparison
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'judges' ? 'active' : ''}`}
            onClick={() => setActiveTab('judges')}
          >
            <StreamlineIcon name="team" size={16} />
            Judge Progress ({progress.length})
          </button>
        </div>

        {/* TAB 1: VISUAL ANALYTICS & GRAPHS */}
        {activeTab === 'analytics' && (
          <div>
            {/* First Row of Charts: Ranking Bar & 5-Metric Radar */}
            <div className="analytics-grid-2col">
              {/* Chart 1: Cohort Ranking */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <div className="analytics-card-title">
                      <StreamlineIcon name="barChart" size={16} /> Cohort Performance Ranking
                    </div>
                    <div className="analytics-card-desc">
                      Top evaluated startups ordered by average total score (out of {MAX_TOTAL})
                    </div>
                  </div>
                </div>
                <div className="analytics-chart-wrap" style={{ height: 320 }}>
                  <canvas ref={rankingChartRef} />
                </div>
              </div>

              {/* Chart 2: 5-Metric Cohort Benchmark */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <div className="analytics-card-title">
                      <StreamlineIcon name="target" size={16} /> 5-Dimension Cohort Benchmark
                    </div>
                    <div className="analytics-card-desc">
                      Average score per criteria vs High-Conviction Benchmark (8.0/10)
                    </div>
                  </div>
                </div>
                <div className="analytics-chart-wrap" style={{ height: 320 }}>
                  <canvas ref={radarChartRef} />
                </div>
              </div>
            </div>

            {/* Second Row of Charts: Multi-Metric Stacked & Tier Doughnut */}
            <div className="analytics-grid-2col">
              {/* Chart 3: Stacked Composition */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <div className="analytics-card-title">
                      <StreamlineIcon name="sliders" size={16} /> Metric Composition (Top Startups)
                    </div>
                    <div className="analytics-card-desc">
                      Breakdown of each startup’s total score across the 5 evaluation criteria
                    </div>
                  </div>
                </div>
                <div className="analytics-chart-wrap" style={{ height: 320 }}>
                  <canvas ref={stackedChartRef} />
                </div>
              </div>

              {/* Chart 4: Performance Tier Distribution */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <div className="analytics-card-title">
                      <StreamlineIcon name="pieChart" size={16} /> Score Tier Distribution
                    </div>
                    <div className="analytics-card-desc">
                      Cohort categorization by investment readiness & score bracket
                    </div>
                  </div>
                </div>
                <div className="analytics-chart-wrap" style={{ height: 320 }}>
                  <canvas ref={tierChartRef} />
                </div>
              </div>
            </div>

            {/* Dimension Champions (Best-in-Class Highlights) */}
            <div style={{ marginTop: 8, marginBottom: 28 }}>
              <h3 className="section-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <StreamlineIcon name="trophy" size={18} /> Best-in-Class Dimension Champions
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2, marginBottom: 12 }}>
                Top-scoring startup in each individual evaluation criterion
              </p>
              <div className="champions-grid">
                {metricChampions.map(({ metric, startup, score }) => (
                  <div key={metric.key} className="champion-card">
                    <div>
                      <div className="champion-badge">
                        <StreamlineIcon name={metric.key} size={12} />
                        Highest Rated
                      </div>
                      <div className="champion-metric-name">{metric.label}</div>
                      <div className="champion-startup-name">
                        {startup ? startup.name : '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
                      <span className="champion-score">
                        {score > 0 ? score.toFixed(1) : '—'} <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>/ 10</span>
                      </span>
                      {startup && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => router.push(`/admin/startup/${startup.id}`)}
                        >
                          Report →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEADERBOARD TABLE */}
        {activeTab === 'leaderboard' && (
          <div>
            {/* Search */}
            <input
              type="text"
              className="search-bar"
              placeholder="Search startups by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 20 }}
            />

            <div className="leaderboard">
              {filteredLeaderboard.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <StreamlineIcon name="fileText" size={40} />
                  </div>
                  <div className="empty-state-text">
                    {search ? 'No startups match your search' : 'No scores submitted yet'}
                  </div>
                </div>
              )}

              {filteredLeaderboard.map((startup) => {
                const rank = leaderboard.indexOf(startup) + 1;
                const topClass =
                  rank === 1
                    ? 'top-1'
                    : rank === 2
                    ? 'top-2'
                    : rank === 3
                    ? 'top-3'
                    : '';
                const rankEmoji =
                  rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;

                return (
                  <div
                    key={startup.id}
                    className={`leaderboard-item ${topClass}`}
                    onClick={() => router.push(`/admin/startup/${startup.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div
                      className={`leaderboard-rank ${
                        rank <= 3 ? `rank-${rank}` : ''
                      }`}
                    >
                      {rankEmoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="leaderboard-name">{startup.name}</div>
                      {/* Metric mini pills preview */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {METRICS.map((m) => {
                          const val = startup.metricAverages?.[m.key] || 0;
                          return (
                            <span
                              key={m.key}
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                background: 'var(--beige-subtle)',
                                border: '1px solid var(--border-hairline)',
                                color: val > 0 ? 'var(--carbon-black)' : 'var(--text-tertiary)',
                                fontWeight: 600,
                              }}
                              title={m.label}
                            >
                              {m.key.slice(0, 7)}: {val > 0 ? val.toFixed(1) : '—'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="leaderboard-judges" style={{ marginRight: 16 }}>
                      {startup.numJudgesScored}/{startup.totalJudges} judges
                    </div>
                    <div
                      className="leaderboard-score"
                      style={{
                        color:
                          startup.avgTotal > 0
                            ? getScoreColor(startup.avgTotal, MAX_TOTAL)
                            : 'var(--text-tertiary)',
                      }}
                    >
                      {startup.avgTotal > 0 ? startup.avgTotal.toFixed(1) : '—'}
                      <span className="leaderboard-max"> / {MAX_TOTAL}</span>
                    </div>
                    <span className="leaderboard-arrow">→</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HEAD-TO-HEAD COMPARISON */}
        {activeTab === 'compare' && (
          <div className="compare-container">
            <div className="compare-selectors">
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Startup A
                </label>
                <select
                  className="compare-select"
                  value={compareIdA}
                  onChange={(e) => setCompareIdA(e.target.value)}
                >
                  {leaderboard.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{leaderboard.indexOf(s) + 1} - {s.name} ({s.avgTotal > 0 ? s.avgTotal.toFixed(1) : '—'} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div className="compare-vs-badge">VS</div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Compare Against
                </label>
                <select
                  className="compare-select"
                  value={compareIdB}
                  onChange={(e) => setCompareIdB(e.target.value)}
                >
                  <option value="cohort">📊 Cohort Average Benchmark ({cohortAvg.toFixed(1)} pts)</option>
                  {leaderboard
                    .filter((s) => String(s.id) !== String(compareIdA))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        #{leaderboard.indexOf(s) + 1} - {s.name} ({s.avgTotal > 0 ? s.avgTotal.toFixed(1) : '—'} pts)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Radar comparison chart */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <div className="analytics-card-title">
                    <StreamlineIcon name="sliders" size={16} /> Comparative Radar
                  </div>
                  <div className="analytics-card-desc">
                    {startupA?.name} vs {startupB?.name} across all 5 evaluation dimensions
                  </div>
                </div>
              </div>
              <div className="analytics-chart-wrap" style={{ height: 340 }}>
                <canvas ref={compareRadarRef} />
              </div>
            </div>

            {/* Side-by-side metric table */}
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Evaluation Metric (10 Marks Each)</th>
                  <th style={{ textAlign: 'center' }}>{startupA?.name || 'Startup A'}</th>
                  <th style={{ textAlign: 'center' }}>{startupB?.name || 'Cohort'}</th>
                  <th style={{ textAlign: 'center' }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const valA = startupA?.metricAverages?.[m.key] || 0;
                  const valB = startupB?.metricAverages?.[m.key] || 0;
                  const diff = Math.round((valA - valB) * 10) / 10;
                  const isPositive = diff > 0;
                  const isZero = diff === 0;

                  return (
                    <tr key={m.key}>
                      <td style={{ fontWeight: 600 }}>
                        <StreamlineIcon name={m.key} size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                        {m.label}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, color: valA >= valB ? 'var(--palm-leaf)' : 'var(--carbon-black)' }}>
                        {valA > 0 ? valA.toFixed(1) : '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, color: valB > valA ? 'var(--palm-leaf)' : 'var(--carbon-black)' }}>
                        {valB > 0 ? valB.toFixed(1) : '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: isZero ? 'var(--text-tertiary)' : isPositive ? '#2e7d32' : '#c62828' }}>
                        {isZero ? '0.0' : (isPositive ? `+${diff.toFixed(1)}` : diff.toFixed(1))}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: 'var(--beige-subtle)', fontWeight: 800 }}>
                  <td>TOTAL OVERALL SCORE (OUT OF {MAX_TOTAL})</td>
                  <td style={{ textAlign: 'center', fontSize: 18, color: 'var(--onyx)' }}>
                    {startupA?.avgTotal ? startupA.avgTotal.toFixed(1) : '—'}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 18, color: 'var(--onyx)' }}>
                    {startupB?.avgTotal ? startupB.avgTotal.toFixed(1) : '—'}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 15 }}>
                    {startupA && startupB ? (
                      (startupA.avgTotal - startupB.avgTotal >= 0 ? `+` : '') +
                      (startupA.avgTotal - startupB.avgTotal).toFixed(1)
                    ) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: JUDGE PROGRESS MATRIX */}
        {activeTab === 'judges' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <h3 className="section-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <StreamlineIcon name="team" size={18} /> Panelist Scoring Completion
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Real-time review completion status for each assigned judge
              </p>
            </div>
            <div className="progress-grid">
              {progress.map((j) => (
                <div key={j.judgeId} className="judge-progress-card">
                  <div className="judge-progress-top">
                    <div
                      className="judge-progress-avatar"
                      style={{ background: j.color || 'var(--beige)' }}
                    >
                      {j.photo ? (
                        <img src={j.photo} alt={j.judgeName} />
                      ) : (
                        j.initials || 'J'
                      )}
                    </div>
                    <div className="judge-progress-info">
                      <span className="judge-progress-name">{j.judgeName}</span>
                      {j.organization && (
                        <span className="judge-progress-org">{j.organization}</span>
                      )}
                    </div>
                    <span
                      className={`judge-progress-count ${
                        j.scored === j.total ? 'judge-progress-complete' : ''
                      }`}
                    >
                      {j.scored === j.total ? '✅ ' : ''}
                      {j.scored}/{j.total}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${j.total > 0 ? (j.scored / j.total) * 100 : 0}%`,
                        background:
                          j.scored === j.total
                            ? 'var(--palm-leaf)'
                            : 'var(--carbon-black)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.isError ? 'toast-error' : ''}`}>
            <span>{toast.isError ? '❌' : '✅'}</span>
            <span className="toast-text">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
