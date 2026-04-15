import { useState, useEffect } from 'react'
import { getProvenance } from '../api'

export default function BiasProvenance({ datasetId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getProvenance(datasetId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [datasetId])

  if (loading) return (
    <div className="loader"><div className="spinner" /><span className="loading-text">&gt; computing influence functions...</span></div>
  )
  if (!data) return <div className="empty-state"><div className="empty-state-title">Provenance analysis failed</div></div>

  const ri = data.removal_impact || {}

  return (
    <div className="animate-fade-in stagger-children">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="section-eyebrow">SURGICAL PRECISION / PROVENANCE</div>
          <h1 className="section-title">Bias Provenance</h1>
        </div>
        <span className="badge badge-danger">TECHNICALLY NOVEL</span>
      </div>

      {/* Insight */}
      <div className="card" style={{ borderLeft: '3px solid var(--lime)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-1)', lineHeight: 1.6 }}>
            {data.insight}
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface)', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>ROWS TO REMOVE</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 900, color: 'var(--red)' }}>{ri.rows_to_remove}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)' }}>of {data.total_rows_analyzed}</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>FAIRNESS BEFORE</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 900, color: 'var(--red)' }}>{Math.round(ri.original_fairness * 100)}%</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>FAIRNESS AFTER</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 900, color: 'var(--green)' }}>{Math.round(ri.new_fairness * 100)}%</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>ACCURACY IMPACT</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 900, color: 'var(--amber)' }}>{ri.accuracy_impact}%</div>
        </div>
      </div>

      {/* Top Bias Rows */}
      <div className="card">
        <div className="card-header">
          <span>Top Bias-Contributing Records</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)' }}>
            Ranked by influence score
          </span>
        </div>
        <div style={{ padding: 0 }}>
          {data.top_bias_rows?.slice(0, 12).map((row, i) => {
            const maxInfluence = data.top_bias_rows[0]?.influence_score || 1
            const barWidth = (row.influence_score / maxInfluence) * 100

            return (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '50px 2fr 1fr 100px',
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
                background: i < 3 ? 'rgba(255,59,59,0.03)' : 'transparent',
              }}>
                {/* Row index */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-4)' }}>
                  #{row.row_index}
                </div>

                {/* Attributes */}
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {Object.entries(row.attributes || {}).map(([k, v]) => (
                      <span key={k} style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                        padding: '2px 6px', background: 'var(--surface-2)',
                        color: 'var(--text-2)',
                      }}>
                        {v}
                      </span>
                    ))}
                    {row.age && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                        padding: '2px 6px', background: 'var(--surface-2)', color: 'var(--text-3)',
                      }}>
                        Age {row.age}
                      </span>
                    )}
                  </div>
                </div>

                {/* Influence bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${barWidth}%`,
                      background: i < 3 ? 'var(--red)' : i < 7 ? 'var(--amber)' : 'var(--text-4)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700,
                    color: i < 3 ? 'var(--red)' : i < 7 ? 'var(--amber)' : 'var(--text-3)',
                  }}>
                    +{row.influence_score}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
