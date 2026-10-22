'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getScoreColor, MAX_TOTAL } from '@/lib/constants';
import StreamlineIcon from '@/components/icons/StreamlineIcons';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState([]);
  const [locked, setLocked] = useState(false);
  const [search, setSearch] = useState('');
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
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
    if (!window.confirm('Are you sure you want to reset all scores? This will clear all submitted scores and cannot be undone.')) {
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
        addToast('All scores have been reset');
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
      'Rank', 'Startup', 'Avg Total',
      'Market Need', 'Feasibility', 'Potential Impact', 'Novelty',
      'Team', 'Fund Utilization', 'Additional Params', 'Presentation',
      'Target Audience', 'Pricing Strategy', 'Competition & USP',
      'Judges Scored'
    ];

    const rows = leaderboard.map((s, i) => [
      i + 1,
      `"${s.name}"`,
      s.avgTotal,
      ...Object.values(s.metricAverages).map((v) => Math.round(v * 10) / 10),
      `${s.numJudgesScored}/${s.totalJudges}`,
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

  const filteredLeaderboard = leaderboard.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!user || loading) {
    return (
      <div className="login-container">
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
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
          <span className="topbar-title">EBC 2.0 Admin</span>
        </div>
        <div className="topbar-user">
          <span className="topbar-user-name">Admin Dashboard</span>
          <button className="btn-logout" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <StreamlineIcon name="logout" size={13} />
            Logout
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Header */}
        <div className="admin-header">
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StreamlineIcon name="sliders" size={20} /> Cumulative Scores
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--palm-leaf)', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)' }} />
                Live Neon Sync (every 4s)
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

        {/* Search */}
        <input
          type="text"
          className="search-bar"
          placeholder="Search startups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 28 }}
        />

        {/* Judge Progress */}
        <div style={{ marginBottom: 8 }}>
          <h3 className="section-title" style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <StreamlineIcon name="team" size={18} /> Judge Progress
          </h3>
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

        {/* Leaderboard */}
        <div style={{ marginBottom: 8 }}>
          <h3 className="section-title" style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <StreamlineIcon name="competition_usp" size={18} /> Leaderboard
          </h3>
        </div>
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

          {filteredLeaderboard.map((startup, index) => {
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
                <div className="leaderboard-name">{startup.name}</div>
                <div className="leaderboard-judges">
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
