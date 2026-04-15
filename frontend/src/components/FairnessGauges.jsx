export default function FairnessGauges({ results }) {
  if (!results) return null

  const overall = results.overall_fairness_score
  const perAttr = results.per_attribute_metrics || {}
  const modelAcc = results.model_results?.accuracy

  const getColor = (score) => score >= 0.9 ? 'good' : score >= 0.7 ? 'warning' : 'danger'

  return (
    <div className="animate-slide-up">
      {/* Big score strip */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: '1rem',
        marginBottom: '0.75rem',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '4.5rem',
          fontWeight: 700,
          lineHeight: 1,
          color: overall >= 0.9 ? 'var(--green)' : overall >= 0.7 ? 'var(--amber)' : 'var(--red)',
        }}>
          {(overall * 100).toFixed(0)}%
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>
            Fairness Score
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '0.35rem' }}>
            <span className={`badge badge-${overall < 0.7 ? 'danger' : overall < 0.9 ? 'warning' : 'success'}`}>
              {overall < 0.7 ? 'SIGNIFICANT BIAS' : overall < 0.9 ? 'MODERATE' : 'FAIR'}
            </span>
            {results.bias_detected && (
              <span className="badge badge-danger">ACTION REQUIRED</span>
            )}
          </div>
        </div>
      </div>

      {/* Per-attribute grid — Bloomberg-style 1px gap grid */}
      <div className="metrics-grid stagger-children">
        {Object.entries(perAttr).map(([attr, metrics]) => (
          <div className="metric-card" key={attr}>
            <div className={`metric-value ${getColor(metrics.fairness_score)}`}>
              {(metrics.disparate_impact * 100).toFixed(0)}%
            </div>
            <div className="metric-label">{attr} parity</div>
            <div style={{
              marginTop: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              color: metrics.four_fifths_rule_violated ? 'var(--red)' : 'var(--green)',
            }}>
              {metrics.four_fifths_rule_violated ? '✕ 4/5ths violated' : '✓ 4/5ths passed'}
            </div>
          </div>
        ))}

        {modelAcc && (
          <div className="metric-card">
            <div className="metric-value" style={{ color: 'var(--blue)' }}>
              {(modelAcc * 100).toFixed(1)}%
            </div>
            <div className="metric-label">Model Accuracy</div>
          </div>
        )}
      </div>
    </div>
  )
}
