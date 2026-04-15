import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { whatIfAnalysis } from '../api'

export default function WhatIfSimulator({ datasetId, results }) {
  const [action, setAction] = useState('adjust_threshold')
  const [selectedFeature, setSelectedFeature] = useState('')
  const [threshold, setThreshold] = useState(0.5)
  const [whatIfResult, setWhatIfResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const sensitiveColumns = results?.dataset_info?.sensitive_columns?.map(s => s.column) || []
  const allColumns = results?.dataset_info?.column_names || []
  const targetCol = results?.dataset_info?.target_column || ''
  const nonTargetCols = allColumns.filter(c => c !== targetCol)

  const runWhatIf = async (overrideThreshold) => {
    setLoading(true)
    try {
      const t = overrideThreshold !== undefined ? overrideThreshold : threshold
      const feature = action === 'adjust_threshold' ? targetCol : selectedFeature
      const res = await whatIfAnalysis(datasetId, feature, action, action === 'adjust_threshold' ? t : null)
      setWhatIfResult(res)
    } catch (e) {
      alert('What-If failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Bug 2 fix: Auto-run on mount so results panel is never empty
  useEffect(() => {
    runWhatIf(0.5)
  }, [datasetId])

  // Auto-run on slider change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (action === 'adjust_threshold') {
        runWhatIf(threshold)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [threshold])

  const buildComparisonData = () => {
    if (!whatIfResult) return []
    const original = whatIfResult.original_details || {}
    const modified = whatIfResult.modified_details || {}
    const data = []
    for (const attr of Object.keys(original)) {
      data.push({
        name: attr,
        before: Math.round((original[attr]?.fairness_score || 0) * 100),
        after: Math.round((modified[attr]?.fairness_score || 0) * 100),
      })
    }
    return data
  }

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Interactive Simulation</div>
          <h2 className="section-title">What-If Simulator</h2>
        </div>
      </div>

      <div className="grid-2">
        {/* Controls Panel */}
        <div>
          <div className="card-title">Simulation Controls</div>
          <div className="card-subtitle">Drag the slider — results update automatically</div>

          <div className="tabs-secondary" style={{ marginTop: '1rem' }}>
            <button
              className={`tab-secondary ${action === 'adjust_threshold' ? 'active' : ''}`}
              onClick={() => setAction('adjust_threshold')}
            >
              Adjust Threshold
            </button>
            <button
              className={`tab-secondary ${action === 'remove' ? 'active' : ''}`}
              onClick={() => setAction('remove')}
            >
              Remove Feature
            </button>
            <button
              className={`tab-secondary ${action === 'balance_groups' ? 'active' : ''}`}
              onClick={() => setAction('balance_groups')}
            >
              Balance Groups
            </button>
          </div>

          {action === 'adjust_threshold' && (
            <div style={{ marginTop: '1.5rem' }}>
              <div className="slider-group">
                <div className="slider-label">
                  <span>Decision Threshold</span>
                  <span>{threshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-4)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  <span>More inclusive (0.1)</span>
                  <span>More selective (0.9)</span>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '1rem' }}>
                Lower threshold = more people accepted, potentially more fair.
                Higher threshold = fewer accepted, potentially amplifies bias.
              </p>
            </div>
          )}

          {action === 'remove' && (
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
                Select feature to remove:
              </label>
              <select
                value={selectedFeature}
                onChange={(e) => setSelectedFeature(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-1)', fontFamily: 'inherit', fontSize: '0.82rem',
                }}
              >
                <option value="">Choose a feature...</option>
                {nonTargetCols.map(col => (
                  <option key={col} value={col}>{col} {sensitiveColumns.includes(col) ? '⚠ sensitive' : ''}</option>
                ))}
              </select>
              <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}
                onClick={() => runWhatIf()} disabled={loading || !selectedFeature}>
                {loading ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>
          )}

          {action === 'balance_groups' && (
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
                Balance groups in:
              </label>
              <select
                value={selectedFeature}
                onChange={(e) => setSelectedFeature(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-1)', fontFamily: 'inherit', fontSize: '0.82rem',
                }}
              >
                <option value="">Choose attribute...</option>
                {sensitiveColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}
                onClick={() => runWhatIf()} disabled={loading || !selectedFeature}>
                {loading ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>
          )}
        </div>

        {/* Results Panel — NEVER empty now */}
        <div>
          {loading && (
            <div className="loader">
              <div className="spinner" />
              <span className="loading-text">&gt; simulating...</span>
            </div>
          )}

          {whatIfResult && !loading && (
            <div className="animate-slide-up">
              <div className="card-title">{whatIfResult.action}</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', marginTop: '1rem' }}>
                <div style={{ background: 'var(--surface)', padding: '1rem' }}>
                  <div className="metric-value danger" style={{ fontSize: '1.8rem' }}>
                    {Math.round(whatIfResult.original_fairness * 100)}%
                  </div>
                  <div className="metric-label">Original</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '1rem' }}>
                  <div className="metric-value good" style={{ fontSize: '1.8rem' }}>
                    {Math.round(whatIfResult.modified_fairness * 100)}%
                  </div>
                  <div className="metric-label">Simulated</div>
                </div>
              </div>

              <div style={{ height: 200, marginTop: '1.5rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={buildComparisonData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#161616', border: '1px solid #2a2a2a' }} />
                    <Bar dataKey="before" name="Before" fill="#ff3b3b" />
                    <Bar dataKey="after" name="After" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {whatIfResult.improvement > 0 ? (
                <div className="alert-banner success" style={{ marginTop: '1rem' }}>
                  <span>✓</span>
                  <span>Fairness improved by {Math.round(whatIfResult.improvement * 100)}pp</span>
                </div>
              ) : (
                <div className="alert-banner critical" style={{ marginTop: '1rem' }}>
                  <span>✕</span>
                  <span>No improvement ({Math.round(whatIfResult.improvement * 100)}pp)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
