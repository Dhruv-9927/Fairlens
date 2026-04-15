export default function BiasHeatmap({ results }) {
  const heatmap = results?.heatmap_data || []
  const perAttr = results?.per_attribute_metrics || {}

  if (!heatmap.length) return null

  // Group by attribute
  const grouped = {}
  heatmap.forEach(item => {
    if (!grouped[item.attribute]) grouped[item.attribute] = []
    grouped[item.attribute].push(item)
  })

  return (
    <div className="card animate-slide-up">
      <div className="card-title">Bias Heatmap</div>
      <div className="card-subtitle">Positive outcome rates by demographic group — red indicates potential bias</div>

      {Object.entries(grouped).map(([attr, items]) => (
        <div key={attr} style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {attr}
            {perAttr[attr]?.bias_detected && (
              <span className="badge badge-danger">Bias Detected</span>
            )}
          </div>

          <div className="heatmap-grid" style={{
            gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          }}>
            {items.sort((a, b) => a.positive_rate - b.positive_rate).map((item, i) => (
              <div
                key={i}
                className={`heatmap-cell bias-${item.bias_level}`}
                title={`${item.group}: ${(item.positive_rate * 100).toFixed(1)}% positive rate (n=${item.count})`}
              >
                <span className="cell-group">{item.group}</span>
                <span className="cell-value">{(item.positive_rate * 100).toFixed(0)}%</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>n={item.count}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Intersectional results */}
      {results?.intersectional_metrics && results.intersectional_metrics.bias_detected && (
        <div style={{ marginTop: '1rem' }}>
          <div className="alert-banner critical">
            <span style={{ fontSize: '1.5rem' }}>🔍</span>
            <div>
              <strong>Intersectional Bias Detected</strong>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                Worst group: <strong>{results.intersectional_metrics.worst_group?.name}</strong> at{' '}
                {(results.intersectional_metrics.worst_group?.positive_rate * 100).toFixed(1)}% vs
                best group: <strong>{results.intersectional_metrics.best_group?.name}</strong> at{' '}
                {(results.intersectional_metrics.best_group?.positive_rate * 100).toFixed(1)}%
                — a gap of {(results.intersectional_metrics.fairness_gap * 100).toFixed(1)} percentage points
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
