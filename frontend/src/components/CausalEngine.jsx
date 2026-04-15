import { useState, useEffect } from 'react'
import { getCausalAnalysis } from '../api'

export default function CausalEngine({ datasetId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    getCausalAnalysis(datasetId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [datasetId])

  if (loading) return (
    <div className="loader"><div className="spinner" /><span className="loading-text">&gt; tracing causal pathways...</span></div>
  )
  if (error) return <div className="empty-state"><div className="empty-state-title">Error: {error}</div></div>
  if (!data) return null

  return (
    <div className="animate-fade-in stagger-children">
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="section-eyebrow">PHD-LEVEL / CAUSAL INFERENCE</div>
          <h1 className="section-title">Causal Root Cause Engine</h1>
        </div>
        <span className="badge badge-danger">NOVEL RESEARCH</span>
      </div>

      {/* Insight Banner */}
      <div className="card" style={{ borderLeft: '3px solid var(--amber)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            KEY INSIGHT
          </div>
          <div style={{ color: 'var(--text-1)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {data.insight}
          </div>
        </div>
      </div>

      {/* Causal Pathways */}
      {data.pathways?.map((pathway, i) => (
        <div className="card" key={i} style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <span>Causal Pathway — {pathway.sensitive_attribute}</span>
            <span className="badge badge-info">
              {pathway.root_cause_not_sensitive ? 'PROXY DETECTED' : 'DIRECT BIAS'}
            </span>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {/* Visual Chain */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              {pathway.causal_chain?.map((node, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    padding: '10px 18px',
                    background: j === 0 ? 'var(--red-dim)' :
                              j === pathway.causal_chain.length - 1 ? 'var(--surface-3)' :
                              'var(--amber-dim)',
                    border: `1px solid ${j === 0 ? 'var(--red)' : j === pathway.causal_chain.length - 1 ? 'var(--border-2)' : 'var(--amber)'}`,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: j === 0 ? 'var(--red)' : j === pathway.causal_chain.length - 1 ? 'var(--text-3)' : 'var(--amber)',
                  }}>
                    {node}
                  </div>
                  {j < pathway.causal_chain.length - 1 && (
                    <span style={{ color: 'var(--lime)', fontFamily: 'var(--font-mono)', fontSize: '1.2rem' }}>→</span>
                  )}
                </div>
              ))}
            </div>

            {/* Root cause callout */}
            <div style={{
              background: 'var(--green-dim)', border: '1px solid var(--green)',
              padding: '1rem 1.25rem', marginBottom: '1.5rem',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--green)',
            }}>
              Root cause: <strong>{pathway.root_cause}</strong> (not {pathway.sensitive_attribute}).{' '}
              {pathway.removal_impact}
            </div>

            {/* Proxy Variables Table */}
            {pathway.proxy_variables?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  PROXY VARIABLES DETECTED
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
                  {pathway.proxy_variables.map((proxy, j) => (
                    <div key={j} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      background: 'var(--surface)', padding: '0.75rem 1rem',
                      fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                    }}>
                      <div>
                        <div style={{ color: 'var(--text-4)', fontSize: '0.55rem', marginBottom: '2px' }}>VARIABLE</div>
                        <div style={{ color: 'var(--text-1)', fontWeight: 600 }}>{proxy.proxy_variable}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-4)', fontSize: '0.55rem', marginBottom: '2px' }}>CORRELATION</div>
                        <div style={{ color: 'var(--amber)' }}>{proxy.correlation_with_sensitive}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-4)', fontSize: '0.55rem', marginBottom: '2px' }}>IMPORTANCE</div>
                        <div style={{ color: 'var(--text-2)' }}>{proxy.importance_for_outcome}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-4)', fontSize: '0.55rem', marginBottom: '2px' }}>BIAS CONTRIB.</div>
                        <div style={{ color: 'var(--red)' }}>+{proxy.bias_contribution}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Feature Importance */}
      <div className="card">
        <div className="card-header"><span>Feature Importance Ranking</span></div>
        <div style={{ padding: '1.25rem' }}>
          {data.feature_importance?.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: f.is_sensitive ? 'var(--red)' : 'var(--text-2)', width: 120 }}>
                {f.is_sensitive ? '⚠ ' : ''}{f.feature}
              </span>
              <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${f.importance * 300}%`,
                  background: f.is_sensitive ? 'var(--red)' : 'var(--lime)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', width: 50, textAlign: 'right' }}>
                {(f.importance * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
