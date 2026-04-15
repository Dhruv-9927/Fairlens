import { useState, useEffect } from 'react'
import { checkCompliance } from '../api'

export default function ComplianceScanner({ datasetId }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await checkCompliance(datasetId)
        setResult(res)
      } catch (e) {
        console.error('Compliance check error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [datasetId])

  if (loading) {
    return (
      <div className="loader">
        <div className="spinner" />
        <span className="loading-text">Scanning regulatory compliance...</span>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚖️</div>
        <div className="empty-state-title">Compliance check unavailable</div>
      </div>
    )
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS': return '✅'
      case 'VIOLATION': return '❌'
      case 'WARNING': return '⚠️'
      default: return '❓'
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PASS': return 'badge-success'
      case 'VIOLATION': return 'badge-danger'
      case 'WARNING': return 'badge-warning'
      default: return 'badge-info'
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h2 className="section-title">⚖️ Regulatory Compliance Scanner</h2>
          <p className="section-subtitle">
            Auto-checking against {result.regulation_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <span className={`badge ${result.overall_compliant ? 'badge-success' : 'badge-danger'}`}>
            {result.overall_compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '1.5rem' }}>
        <div className="metric-card" style={{ borderColor: result.overall_compliant ? 'rgba(52,211,153,0.3)' : 'rgba(251,113,133,0.3)' }}>
          <div className={`metric-value ${result.overall_compliant ? 'good' : 'danger'}`}>
            {result.overall_compliant ? '✅' : '❌'}
          </div>
          <div className="metric-label">Overall Status</div>
        </div>
        <div className="metric-card">
          <div className="metric-value danger">{result.violations_count}</div>
          <div className="metric-label">Violations</div>
        </div>
        <div className="metric-card">
          <div className="metric-value warning">{result.warnings_count}</div>
          <div className="metric-label">Warnings</div>
        </div>
      </div>

      {!result.overall_compliant && (
        <div className="alert-banner critical" style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚖️</span>
          <div>
            <strong>Regulatory violations detected</strong>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
              {result.violations_count} rule(s) violated under {result.regulation_name}. 
              Immediate review recommended.
            </div>
          </div>
        </div>
      )}

      {/* Individual Rules */}
      <div className="card">
        <div className="card-title">Compliance Checks</div>
        <div className="card-subtitle">Each rule checked against your dataset's fairness metrics</div>

        <div style={{ marginTop: '1rem' }} className="stagger-children">
          {result.checks.map((check, i) => (
            <div className="compliance-rule" key={i}>
              <div className="compliance-icon">{getStatusIcon(check.status)}</div>
              <div className="compliance-info">
                <div className="compliance-name">
                  {check.rule_name}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8, fontSize: '0.8rem' }}>
                    ({check.attribute})
                  </span>
                </div>
                <div className="compliance-desc">{check.description}</div>
                <div className="compliance-citation">📎 {check.citation}</div>
                <div style={{ marginTop: 6, fontSize: '0.8rem' }}>
                  Measured: <strong style={{ color: check.status === 'PASS' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {(check.measured_value * 100).toFixed(1)}%
                  </strong>
                  {' '}/ Threshold: {(check.threshold * 100).toFixed(0)}%
                </div>
              </div>
              <div className="compliance-status">
                <span className={`badge ${getStatusBadge(check.status)}`}>{check.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
