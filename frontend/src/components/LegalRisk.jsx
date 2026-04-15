import { useState, useEffect } from 'react'
import { getLegalRisk } from '../api'

function formatUSD(amount) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

export default function LegalRisk({ datasetId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getLegalRisk(datasetId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [datasetId])

  if (loading) return (
    <div className="loader"><div className="spinner" /><span className="loading-text">&gt; calculating regulatory exposure...</span></div>
  )
  if (!data) return <div className="empty-state"><div className="empty-state-title">Could not calculate legal risk</div></div>

  return (
    <div className="animate-fade-in stagger-children">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="section-eyebrow">BUSINESS CASE / LEGAL RISK</div>
          <h1 className="section-title">Legal Risk Dollar Estimator</h1>
        </div>
        <span className="badge badge-danger">{data.violations_count} VIOLATIONS</span>
      </div>

      {/* Giant Total */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderTop: '3px solid var(--red)' }}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
              ESTIMATED TOTAL LEGAL EXPOSURE
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: 'var(--red)', lineHeight: 1 }}>
              {formatUSD(data.total_exposure_before)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)', marginTop: '0.5rem' }}>
              Before mitigation
            </div>
          </div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--green)' }}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
              AFTER FAIRLENS MITIGATION
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: 'var(--green)', lineHeight: 1 }}>
              {formatUSD(data.total_exposure_after)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)', marginTop: '0.5rem' }}>
              −{data.total_reduction_pct}% reduction
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><span>Risk Breakdown by Regulation</span></div>
        <div style={{ padding: 0 }}>
          {data.risk_items?.map((item, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
              padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-1)', marginBottom: '2px' }}>
                  {item.regulation}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-4)' }}>
                  {item.citation}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)', marginBottom: '2px' }}>VIOLATIONS</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--red)', fontWeight: 700 }}>{item.violations_found}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)', marginBottom: '2px' }}>EXPOSURE</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--amber)', fontWeight: 700 }}>{formatUSD(item.class_action_exposure)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)', marginBottom: '2px' }}>AFTER FIX</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--green)', fontWeight: 700 }}>{formatUSD(item.after_mitigation)}</div>
              </div>
              <span className={`badge ${item.severity === 'CRITICAL' ? 'badge-danger' : item.severity === 'HIGH' ? 'badge-warning' : 'badge-info'}`}>
                {item.severity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sources */}
      <div className="card">
        <div className="card-header"><span>Sources & Methodology</span></div>
        <div style={{ padding: '1rem 1.25rem' }}>
          {data.risk_items?.map((item, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-4)' }}>[{i + 1}]</span> {item.source}
            </div>
          ))}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-4)', marginTop: '1rem', fontStyle: 'italic' }}>
            {data.disclaimer}
          </div>
        </div>
      </div>
    </div>
  )
}
