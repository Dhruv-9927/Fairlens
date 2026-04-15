import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { mitigateBias } from '../api'

export default function MitigationView({ datasetId }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState('reweighting')

  const runMitigation = async () => {
    setLoading(true)
    try {
      const res = await mitigateBias(datasetId, method)
      setResult(res)
    } catch (e) {
      alert('Mitigation failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const buildChartData = (metricsObj) => {
    if (!metricsObj) return []
    return Object.entries(metricsObj).map(([attr, m]) => ({
      name: attr,
      fairness: Math.round(m.fairness_score * 100),
      isZero: m.fairness_score === 0,
    }))
  }

  // Custom bar label that shows "N/A" for 0-height bars
  const renderBarLabel = (props) => {
    const { x, y, width, value } = props
    if (value === 0) {
      return (
        <text x={x + width / 2} y={y - 8} fill="#666" textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)">
          no data
        </text>
      )
    }
    return null
  }

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Bias Correction</div>
          <h2 className="section-title">One-Click Mitigation</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="toggle-group">
            <button
              className={`toggle-option ${method === 'reweighting' ? 'active' : ''}`}
              onClick={() => setMethod('reweighting')}
            >
              Reweighting
            </button>
            <button
              className={`toggle-option ${method === 'resampling' ? 'active' : ''}`}
              onClick={() => setMethod('resampling')}
            >
              Resampling
            </button>
          </div>
          <button className="btn btn-success" onClick={runMitigation} disabled={loading}>
            {loading ? 'Processing...' : 'Apply Mitigation'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loader">
          <div className="spinner" />
          <span className="loading-text">&gt; applying {method}...</span>
        </div>
      )}

      {result && !loading && (
        <div className="stagger-children">
          {/* Bug 1 fix: Consistent X% format everywhere */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-value danger">
                {Math.round(result.before.overall_fairness_score * 100)}%
              </div>
              <div className="metric-label">Before Fairness</div>
            </div>
            <div className="metric-card">
              <div className="metric-value good">
                {Math.round(result.after.overall_fairness_score * 100)}%
              </div>
              <div className="metric-label">After Fairness</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ color: 'var(--blue)' }}>
                {result.accuracy_impact > 0 ? '+' : ''}{Math.round(result.accuracy_impact * 100)}%
              </div>
              <div className="metric-label">Accuracy Impact</div>
            </div>
            <div className="metric-card">
              <div className="metric-value good">
                +{Math.round(result.fairness_improvement * 100)}%
              </div>
              <div className="metric-label">Fairness Gain</div>
            </div>
          </div>

          {/* Before / After Charts */}
          <div className="comparison" style={{ marginTop: '1rem' }}>
            <div className="card">
              <div className="card-title" style={{ color: 'var(--red)' }}>Before Mitigation</div>
              <div style={{ height: 250, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={buildChartData(result.before.per_attribute)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#161616', border: '1px solid #2a2a2a' }} />
                    <Bar dataKey="fairness" label={renderBarLabel}>
                      {buildChartData(result.before.per_attribute).map((entry, i) => (
                        <Cell key={i} fill={entry.fairness >= 90 ? '#22c55e' : entry.fairness >= 70 ? '#ffb800' : entry.fairness > 0 ? '#ff3b3b' : '#2a2a2a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="comparison-arrow">→</div>

            <div className="card">
              <div className="card-title" style={{ color: 'var(--green)' }}>After Mitigation</div>
              <div style={{ height: 250, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={buildChartData(result.after.per_attribute)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#161616', border: '1px solid #2a2a2a' }} />
                    <Bar dataKey="fairness" label={renderBarLabel}>
                      {buildChartData(result.after.per_attribute).map((entry, i) => (
                        <Cell key={i} fill={entry.fairness >= 90 ? '#22c55e' : entry.fairness >= 70 ? '#ffb800' : entry.fairness > 0 ? '#ff3b3b' : '#2a2a2a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="alert-banner success" style={{ marginTop: '1rem' }}>
            <span>✓</span>
            <div>
              <strong>Mitigation Complete</strong>
              <div style={{ fontSize: '0.75rem', marginTop: 2, color: 'var(--text-3)' }}>
                {result.method} — Fairness +{Math.round(result.fairness_improvement * 100)}% with {Math.abs(Math.round(result.accuracy_impact * 100))}% accuracy change
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">—</div>
          <div className="empty-state-title">Ready to mitigate bias</div>
          <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.35rem' }}>
            Choose a method above and click "Apply Mitigation"
          </p>
        </div>
      )}
    </div>
  )
}
