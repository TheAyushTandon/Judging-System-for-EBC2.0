'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { METRICS, MAX_TOTAL, SCORE_STEPS, getScoreColor } from '@/lib/constants';
import StreamlineIcon from '@/components/icons/StreamlineIcons';

export default function JudgeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showIdCard, setShowIdCard] = useState(true);
  const [startups, setStartups] = useState([]);
  const [selectedStartup, setSelectedStartup] = useState('');
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState('');
  const [scoredStartups, setScoredStartups] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [locked, setLocked] = useState(false);
  const idCardRef = useRef(null);
  const metricsRef = useRef([]);
  const animeRef = useRef(null);

  // Initialize
  useEffect(() => {
    const userData = localStorage.getItem('ebc2_user');
    const token = localStorage.getItem('ebc2_token');

    if (!userData || !token) {
      router.push('/');
      return;
    }

    const parsed = JSON.parse(userData);
    if (parsed.role === 'admin') {
      router.push('/admin');
      return;
    }
    setUser(parsed);

    // Load anime.js
    import('animejs').then((mod) => {
      animeRef.current = mod.default || mod;
    }).catch(() => {});

    fetchStartups(token);
    fetchExistingScores(token);
  }, [router]);

  // ID card flip animation
  useEffect(() => {
    if (showIdCard && idCardRef.current && animeRef.current) {
      setTimeout(() => {
        idCardRef.current.classList.add('visible');
      }, 200);
    }
  }, [showIdCard, user]);

  // Metric card stagger animation
  useEffect(() => {
    if (!showIdCard && animeRef.current && metricsRef.current.length > 0) {
      setTimeout(() => {
        metricsRef.current.forEach((card, i) => {
          if (card) {
            setTimeout(() => card.classList.add('visible'), i * 60);
          }
        });
      }, 100);
    }
  }, [showIdCard, selectedStartup]);

  async function fetchStartups(token) {
    try {
      const res = await fetch('/api/startups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStartups(data.startups || []);
    } catch (err) {
      addToast('Failed to load startups', true);
    }
  }

  async function fetchExistingScores(token) {
    try {
      const res = await fetch('/api/scores', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const map = {};
      (data.scores || []).forEach((s) => {
        map[s.startupId] = s;
      });
      setScoredStartups(map);
    } catch (err) {
      console.error('Failed to load scores');
    }
  }

  function addToast(message, isError = false) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  function handleStartupChange(e) {
    const startupId = e.target.value;
    setSelectedStartup(startupId);

    // Load existing scores if any
    if (scoredStartups[startupId]) {
      const existing = scoredStartups[startupId];
      setScores(existing.scores || {});
      setRemarks(existing.remarks || '');
    } else {
      // Reset scores
      const initial = {};
      METRICS.forEach((m) => {
        initial[m.key] = 0;
      });
      setScores(initial);
      setRemarks('');
    }

    // Re-trigger animation
    metricsRef.current.forEach((card) => {
      if (card) card.classList.remove('visible');
    });
  }

  function handleScoreChange(key, value) {
    const numVal = parseFloat(value);
    setScores((prev) => ({ ...prev, [key]: numVal }));
  }

  function getRunningTotal() {
    return Object.values(scores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  }

  function fireConfetti() {
    const anime = animeRef.current;
    if (!anime) return;

    const colors = ['#899878', '#e4e6c3', '#222725', '#a5b395', '#627252'];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${50 + (Math.random() - 0.5) * 20}%`;
      piece.style.top = '50%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = `${Math.random() * 8 + 4}px`;
      piece.style.height = `${Math.random() * 8 + 4}px`;
      piece.style.borderRadius = '0px';
      document.body.appendChild(piece);

      anime({
        targets: piece,
        translateX: anime.random(-300, 300),
        translateY: anime.random(-400, 200),
        rotate: anime.random(0, 720),
        opacity: [1, 0],
        duration: anime.random(1000, 2000),
        easing: 'easeOutExpo',
        delay: anime.random(0, 300),
        complete: () => piece.remove(),
      });
    }
  }

  async function handleSubmit() {
    if (!selectedStartup) {
      addToast('Please select a startup first', true);
      return;
    }

    // Validate all scores > 0
    const allScored = METRICS.every((m) => scores[m.key] > 0);
    if (!allScored) {
      addToast('Please score all metrics before submitting', true);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('ebc2_token');

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startupId: parseInt(selectedStartup),
          scores,
          remarks,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Failed to submit scores', true);
        setLoading(false);
        if (data.error?.includes('locked')) {
          setLocked(true);
        }
        return;
      }

      // Success!
      setScoredStartups((prev) => ({
        ...prev,
        [selectedStartup]: { scores, remarks, total: getRunningTotal() },
      }));

      setShowSuccess(true);
      fireConfetti();

      setTimeout(() => {
        setShowSuccess(false);
      }, 2500);

      addToast(`Scores submitted for ${startups.find((s) => s.id == selectedStartup)?.name}!`);
    } catch (err) {
      addToast('Network error. Please try again.', true);
    }

    setLoading(false);
  }

  function handleLogout() {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('ebc2_user');
    localStorage.removeItem('ebc2_token');
    router.push('/');
  }

  function getScoredCount() {
    return Object.keys(scoredStartups).length;
  }

  if (!user) return null;

  // ── ID CARD VIEW ──
  if (showIdCard) {
    return (
      <div className="idcard-container">
        <div className="idcard" ref={idCardRef}>
          <div className="idcard-lanyard-slot" />
          <div className="idcard-ribbon">
            <span>EBC 2.0 • EVALUATION</span>
            <span>DELEGATE PASS</span>
          </div>

          <div className="idcard-photo-frame">
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                className="idcard-photo-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.idcard-photo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="idcard-photo-fallback"
              style={{
                display: user.photo ? 'none' : 'flex',
                background: user.color || 'var(--carbon-black)',
              }}
            >
              {user.initials}
            </div>
          </div>

          <div className="idcard-name">{user.name}</div>
          {user.roleTitle && <div className="idcard-role">{user.roleTitle}</div>}
          {user.organization && <div className="idcard-org">{user.organization}</div>}

          <div className="idcard-badge-row">
            <span className="idcard-badge designation">
              <StreamlineIcon name="competition_usp" size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {user.eventDesignation || 'Panelist'}
            </span>
            <span className="idcard-badge">EBC 2.0</span>
          </div>

          <div className="idcard-spec-box">
            <span className="idcard-spec-label">Domain / Specialisation</span>
            <span className="idcard-spec-value">{user.specialisation}</span>
          </div>

          <div className="idcard-barcode-bar">
            <span>PASS ID: EBC2-PANEL-{user.id?.toUpperCase()}</span>
            <span>||||| | |||| |||</span>
          </div>

          <button
            className="btn btn-primary btn-lg idcard-enter"
            onClick={() => setShowIdCard(false)}
          >
            Enter Judging Portal →
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ──
  const total = getRunningTotal();
  const totalColor = getScoreColor(total, MAX_TOTAL);

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <StreamlineIcon name="trophy" size={20} />
          </div>
          <span className="topbar-title">EBC 2.0</span>
        </div>
        <div className="topbar-user">
          <div style={{ textAlign: 'right' }}>
            <div className="topbar-user-name">{user.name}</div>
            {user.organization && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {user.organization}
              </div>
            )}
          </div>
          <div
            className="topbar-avatar-sm"
            style={{
              background: user.color || 'var(--accent-primary)',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user.initials
            )}
          </div>
          <button className="btn-logout" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <StreamlineIcon name="logout" size={13} />
            Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="main-content">
        <h2 className="section-title">Score Startups</h2>
        <p className="section-subtitle">
          Select a startup from the dropdown and rate each metric
        </p>

        {locked && (
          <div className="locked-banner" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <StreamlineIcon name="lock" size={16} />
            Scoring has been locked by the admin. Contact the admin to unlock.
          </div>
        )}

        {/* Startup Selector */}
        <div className="selector-card">
          <div className="selector-label">Select Startup</div>
          <select
            className="startup-select"
            value={selectedStartup}
            onChange={handleStartupChange}
          >
            <option value="">— Choose a startup to score —</option>
            {startups.map((s) => (
              <option key={s.id} value={s.id}>
                {scoredStartups[s.id] ? '✅ ' : ''}
                {s.pitchOrder}. {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Progress */}
        <div className="progress-section">
          <div className="progress-label">
            <span className="progress-text">Your Progress</span>
            <span className="progress-count">
              {getScoredCount()} / {startups.length} scored
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${startups.length > 0 ? (getScoredCount() / startups.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Scoring Area */}
        {selectedStartup && (
          <>
            {/* Score Guide Button */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowGuide(true)}
              >
                ❓ Scoring Guide
              </button>
            </div>

            {/* Metrics */}
            <div className="metrics-grid">
              {METRICS.map((metric, index) => {
                const val = scores[metric.key] || 0;
                const scoreColor = getScoreColor(val, metric.maxScore);

                return (
                  <div
                    key={metric.key}
                    className="metric-card"
                    ref={(el) => (metricsRef.current[index] = el)}
                  >
                    <div className="metric-header">
                      <div className="metric-info">
                        <div className="metric-icon">
                          <StreamlineIcon name={metric.key} size={20} strokeWidth={1.8} />
                        </div>
                        <div>
                          <div className="metric-label">{metric.label}</div>
                          <div className="metric-desc">{metric.description}</div>
                        </div>
                      </div>
                      <div
                        className="metric-score-display"
                        style={{ color: val > 0 ? scoreColor : 'var(--text-tertiary)' }}
                      >
                        {val > 0 ? val.toFixed(1) : '—'}
                        <span className="metric-score-max"> / {metric.maxScore}</span>
                      </div>
                    </div>
                    <div className="slider-container">
                      <input
                        type="range"
                        className="custom-slider"
                        min="0"
                        max={metric.maxScore}
                        step={SCORE_STEPS}
                        value={val}
                        onChange={(e) => handleScoreChange(metric.key, e.target.value)}
                        style={{
                          background: val > 0
                            ? `linear-gradient(to right, ${scoreColor} 0%, ${scoreColor} ${(val / metric.maxScore) * 100}%, #e4e6c3 ${(val / metric.maxScore) * 100}%, #e4e6c3 100%)`
                            : undefined,
                        }}
                        disabled={locked}
                      />
                      <div className="slider-labels">
                        <span className="slider-label-item">0</span>
                        <span className="slider-label-item">5</span>
                        <span className="slider-label-item">10</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Running Total */}
            <div className="running-total">
              <div className="total-label">Running Total</div>
              <div className="total-value" style={{ color: totalColor }}>
                {total.toFixed(1)}
                <span className="total-max"> / {MAX_TOTAL}</span>
              </div>
            </div>

            {/* Remarks */}
            <div className="remarks-section">
              <div className="selector-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StreamlineIcon name="message" size={15} /> Remarks (optional)
              </div>
              <textarea
                className="remarks-textarea"
                placeholder="Add any notes about this startup to help you remember your evaluation..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={locked}
              />
            </div>

            {/* Submit */}
            <div className="submit-area">
              <button
                className="btn btn-success btn-lg"
                onClick={handleSubmit}
                disabled={loading || locked}
              >
                {loading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <StreamlineIcon name="refresh" size={16} /> Submitting...
                  </span>
                ) : scoredStartups[selectedStartup] ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <StreamlineIcon name="check" size={16} /> Update Scores
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <StreamlineIcon name="check" size={16} /> Submit Scores
                  </span>
                )}
              </button>
            </div>
          </>
        )}

        {!selectedStartup && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <StreamlineIcon name="presentation" size={44} />
            </div>
            <div className="empty-state-text">
              Select a startup to begin scoring
            </div>
          </div>
        )}
      </div>

      {/* Score Guide Modal */}
      <div className={`modal-overlay ${showGuide ? 'active' : ''}`}>
        <div className="modal">
          <button className="modal-close" onClick={() => setShowGuide(false)}>
            ✕
          </button>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StreamlineIcon name="sliders" size={18} /> Scoring Guide
          </div>
          <div className="score-guide-row">
            <div className="score-guide-range" style={{ color: '#FF6B6B' }}>0 – 2</div>
            <div className="score-guide-label">Poor — Significant gaps or missing entirely</div>
          </div>
          <div className="score-guide-row">
            <div className="score-guide-range" style={{ color: '#FFB347' }}>2.5 – 4</div>
            <div className="score-guide-label">Below Average — Needs major improvement</div>
          </div>
          <div className="score-guide-row">
            <div className="score-guide-range" style={{ color: '#FFB347' }}>4.5 – 5.5</div>
            <div className="score-guide-label">Average — Meets basic expectations</div>
          </div>
          <div className="score-guide-row">
            <div className="score-guide-range" style={{ color: '#6C63FF' }}>6 – 7.5</div>
            <div className="score-guide-label">Good — Solid, above average performance</div>
          </div>
          <div className="score-guide-row">
            <div className="score-guide-range" style={{ color: '#00D4AA' }}>8 – 9</div>
            <div className="score-guide-label">Excellent — Impressive, stands out clearly</div>
          </div>
          <div className="score-guide-row" style={{ borderBottom: 'none' }}>
            <div className="score-guide-range" style={{ color: '#00D4AA' }}>9.5 – 10</div>
            <div className="score-guide-label">Outstanding — Best in class, exceptional</div>
          </div>
        </div>
      </div>

      {/* Success Overlay */}
      <div className={`success-overlay ${showSuccess ? 'active' : ''}`}>
        <div className="success-content">
          <div className="success-checkmark">✓</div>
          <div className="success-text">Scores Submitted!</div>
          <div className="success-subtext">
            {startups.find((s) => s.id == selectedStartup)?.name}
          </div>
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
