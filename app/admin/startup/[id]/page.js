'use client';

import { useState, useEffect, useRef, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { METRICS, MAX_TOTAL, getScoreColor } from '@/lib/constants';
import StreamlineIcon from '@/components/icons/StreamlineIcons';

function StartupReportContent({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef(null);
  const reportRef = useRef(null);

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

    fetchReport(token);
  }, [id, router]);

  useEffect(() => {
    if (report && chartRef.current) {
      renderRadarChart();
    }
  }, [report]);

  async function fetchReport(token) {
    try {
      const res = await fetch(`/api/admin/startup/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Failed to load report', true);
        setLoading(false);
        return;
      }
      setReport(data);
      setLoading(false);
    } catch (err) {
      addToast('Failed to load report', true);
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

  async function renderRadarChart() {
    if (!chartRef.current || !report) return;

    try {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      // Destroy existing chart if any
      const existing = Chart.getChart(chartRef.current);
      if (existing) existing.destroy();

      const labels = METRICS.map((m) => m.label);
      const data = METRICS.map((m) => report.metricAverages[m.key] || 0);

      new Chart(chartRef.current, {
        type: 'radar',
        data: {
          labels,
          datasets: [
            {
              label: report.startup.name,
              data,
              backgroundColor: 'rgba(137, 152, 120, 0.25)',
              borderColor: '#899878',
              borderWidth: 2,
              pointBackgroundColor: '#222725',
              pointBorderColor: '#f7f7f2',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
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
              grid: {
                color: 'rgba(34, 39, 37, 0.12)',
              },
              angleLines: {
                color: 'rgba(34, 39, 37, 0.12)',
              },
              pointLabels: {
                color: '#121113',
                font: { size: 11, family: 'Inter', weight: '600' },
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
    } catch (err) {
      console.error('Chart error:', err);
    }
  }

  async function exportPDF() {
    setExporting(true);
    addToast('Generating PDF...');

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = reportRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        backgroundColor: '#f7f7f2',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Handle multi-page
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      while (position < pdfHeight) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, pdfHeight);
        position += pageHeight;
      }

      pdf.save(`${report.startup.name}_EBC2_Report.pdf`);
      addToast('PDF exported successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      addToast('Failed to export PDF. Try printing (Ctrl+P) instead.', true);
    }

    setExporting(false);
  }

  if (!user || loading) {
    return (
      <div className="login-container">
        <div style={{ color: 'var(--text-secondary)' }}>Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="login-container">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <div className="empty-state-text">Report not found</div>
          <button className="btn btn-primary" onClick={() => router.push('/admin')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  function getConsensusClass(stdDev) {
    if (stdDev <= 1) return 'consensus-high';
    if (stdDev <= 2) return 'consensus-medium';
    return 'consensus-low';
  }

  function getConsensusLabel(stdDev) {
    if (stdDev <= 1) return '✓ High Consensus';
    if (stdDev <= 2) return '~ Moderate';
    return '⚠ Low Consensus';
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
          <button className="btn-logout" onClick={() => router.push('/admin')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="admin-content" ref={reportRef}>
        {/* Back link */}
        <a
          className="back-link"
          onClick={() => router.push('/admin')}
          style={{ cursor: 'pointer' }}
        >
          ← Back to Leaderboard
        </a>

        {/* Header */}
        <div className="report-header">
          <div>
            <div className="report-title">{report.startup.name}</div>
            <p className="section-subtitle">
              Scored by {report.totalJudgesScored} judge(s) • Pitch #{report.startup.pitchOrder}
            </p>
          </div>
          <div className="admin-actions">
            <button
              className="export-btn"
              onClick={exportPDF}
              disabled={exporting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <StreamlineIcon name="download" size={14} />
              {exporting ? 'Generating...' : 'Export PDF'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <StreamlineIcon name="fileText" size={14} />
              Print
            </button>
          </div>
        </div>

        {/* Overall Summary */}
        <div className="overall-summary">{report.overallSummary}</div>

        {/* Overall Score */}
        <div className="running-total" style={{ marginBottom: 32 }}>
          <div className="total-label">Average Total Score</div>
          <div
            className="total-value"
            style={{
              color:
                report.avgTotal > 0
                  ? getScoreColor(report.avgTotal, MAX_TOTAL)
                  : undefined,
            }}
          >
            {report.avgTotal.toFixed(1)}
            <span className="total-max"> / {MAX_TOTAL}</span>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="report-card">
          <div className="report-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StreamlineIcon name="target_audience" size={18} /> Performance Radar
          </div>
          <div className="chart-container">
            <canvas ref={chartRef} />
          </div>
        </div>

        {/* Metric Breakdown */}
        <div className="report-card">
          <div className="report-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StreamlineIcon name="sliders" size={18} /> Detailed Metric Breakdown
          </div>
          {METRICS.map((metric) => {
            const breakdown = report.metricBreakdown[metric.key];
            if (!breakdown) return null;

            return (
              <div key={metric.key} className="metric-breakdown">
                <div className="metric-breakdown-header">
                  <div className="metric-breakdown-label">
                    <StreamlineIcon name={metric.key} size={18} strokeWidth={1.8} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                    <span>{metric.label}</span>
                    <span
                      className={`consensus-badge ${getConsensusClass(
                        breakdown.stdDev
                      )}`}
                    >
                      {getConsensusLabel(breakdown.stdDev)}
                    </span>
                  </div>
                  <div
                    className="metric-breakdown-avg"
                    style={{
                      color: getScoreColor(breakdown.average, 10),
                    }}
                  >
                    {breakdown.average.toFixed(1)}
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                      {' '}
                      / 10
                    </span>
                  </div>
                </div>

                {/* Individual judge scores */}
                <div className="metric-breakdown-scores">
                  {breakdown.scores.map((s) => (
                    <div key={s.judgeId} className="judge-score-chip">
                      {s.judgeName}: <strong>{s.score > 0 ? s.score : '—'}</strong>
                    </div>
                  ))}
                </div>

                {/* Score bar */}
                <div className="progress-bar" style={{ marginBottom: 8 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(breakdown.average / 10) * 100}%`,
                      background: getScoreColor(breakdown.average, 10),
                    }}
                  />
                </div>

                {/* Tips */}
                {breakdown.tips.length > 0 && (
                  <ul className="tips-list">
                    {breakdown.tips.map((tip, i) => (
                      <li key={i} className="tip-item">
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Judge Remarks */}
        {report.remarks.length > 0 && (
          <div className="report-card">
            <div className="report-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StreamlineIcon name="message" size={18} /> Judge Remarks
            </div>
            {report.remarks.map((r, i) => (
              <div key={i} className="remark-item">
                <div className="remark-judge">{r.judgeName}</div>
                <div className="remark-text">{r.remark}</div>
              </div>
            ))}
          </div>
        )}

        {report.remarks.length === 0 && (
          <div className="report-card">
            <div className="report-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StreamlineIcon name="message" size={18} /> Judge Remarks
            </div>
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-state-text" style={{ fontSize: 14 }}>
                No remarks submitted yet
              </div>
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

export default function StartupReportPage(props) {
  return (
    <Suspense
      fallback={
        <div className="login-container">
          <div style={{ color: 'var(--text-secondary)' }}>Loading report...</div>
        </div>
      }
    >
      <StartupReportContent {...props} />
    </Suspense>
  );
}
