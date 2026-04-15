import { useState, useEffect } from 'react'
import { getCounterfactuals } from '../api'

export default function CounterfactualCards({ datasetId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await getCounterfactuals(datasetId)
        setData(res)
      } catch (e) {
        console.error('Counterfactual error:', e)
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
        <span className="loading-text">Generating counterfactual stories...</span>
      </div>
    )
  }

  if (!data || !data.counterfactuals?.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👤</div>
        <div className="empty-state-title">No counterfactual bias found</div>
        <p style={{ color: 'var(--text-muted)' }}>
          The model doesn't show individual-level bias for flipped attributes
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h2 className="section-title">👤 Counterfactual Stories</h2>
          <p className="section-subtitle">
            Real individuals whose outcome would change if only their {data.sensitive_column} were different
          </p>
        </div>
        <span className="badge badge-danger">
          {data.bias_affected_count} affected of {data.total_rejected} rejected
        </span>
      </div>

      <div className="alert-banner critical" style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>💡</span>
        <div>
          <strong>These are real records from your dataset</strong>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Each story shows what would happen if we flipped a single demographic attribute while keeping everything else identical
          </div>
        </div>
      </div>

      <div className="grid-2 stagger-children">
        {data.counterfactuals.map((cf, i) => (
          <div className="cf-card" key={i}>
            <div className="cf-name">{cf.name}</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span className="badge badge-info">{cf.original_attribute}</span>
              {cf.profile.age && <span className="badge badge-info">Age: {cf.profile.age}</span>}
              {cf.profile.education && <span className="badge badge-info">{cf.profile.education}</span>}
            </div>
            <p className="cf-story">{cf.story}</p>
            <div className="cf-outcome">
              <div className="cf-outcome-box rejected">
                <div style={{ fontWeight: 700, color: 'var(--accent-rose)', fontSize: '0.9rem' }}>
                  {cf.original_outcome}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(cf.original_probability * 100).toFixed(1)}% probability
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>→</span>
              <div className="cf-outcome-box accepted">
                <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.9rem' }}>
                  {cf.counterfactual_outcome}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(cf.counterfactual_probability * 100).toFixed(1)}% if {cf.counterfactual_attribute.split(': ')[1]}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
