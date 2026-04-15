import { useState, useEffect } from 'react'
import { getSyntheticData } from '../api'

export default function SyntheticGenerator({ datasetId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSyntheticData(datasetId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [datasetId])

  if (loading) return (
    <div className="loader"><div className="spinner" /><span className="loading-text">&gt; generating debiased synthetic data...</span></div>
  )
  if (!data) return <div className="empty-state"><div className="empty-state-title">Synthetic data generation failed</div></div>

  const downloadCSV = () => {
    if (!data.preview) return
    const cols = Object.keys(data.preview[0])
    let csv = cols.join(',') + '\n'
    data.preview.forEach(row => {
      csv += cols.map(c => row[c]).join(',') + '\n'
    })
    csv += '# ... (full dataset contains ' + data.synthetic_rows + ' rows)\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'debiased_synthetic.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-fade-in stagger-children">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="section-eyebrow">MITIGATION / SYNTHETIC DATA</div>
          <h1 className="section-title">Synthetic Debiased Dataset</h1>
        </div>
        <button className="btn btn-primary" onClick={downloadCSV}>↓ Download debiased_synthetic.csv</button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            ORIGINAL DATASET
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 900, color: 'var(--text-2)' }}>
            {data.original_rows}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)' }}>rows</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            SYNTHETIC GENERATED
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 900, color: 'var(--lime)' }}>
            {data.synthetic_rows}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)' }}>rows</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            STATISTICAL FIDELITY
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 900, color: 'var(--green)' }}>
            {data.statistical_fidelity}%
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)' }}>preserved</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            COLUMNS
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 900, color: 'var(--text-2)' }}>
            {data.columns_preserved}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)' }}>preserved</div>
        </div>
      </div>

      {/* Fairness Metrics */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><span>Fairness Parity — Synthetic Data</span><span className="badge badge-success">DEBIASED</span></div>
        <div style={{ padding: '1.25rem' }}>
          {Object.entries(data.fairness_metrics || {}).map(([attr, m]) => (
            <div key={attr} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-1)', textTransform: 'capitalize' }}>
                  {attr} Parity
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700,
                  color: m.parity >= 80 ? 'var(--green)' : 'var(--red)',
                }}>
                  {m.parity}% {m.parity >= 80 ? '✓' : '✗'}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${m.parity}%`,
                  background: m.parity >= 80 ? 'var(--green)' : 'var(--red)',
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                {Object.entries(m.group_rates || {}).map(([g, rate]) => (
                  <div key={g} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)' }}>
                    {g}: {(rate * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="card">
        <div className="card-header"><span>Data Preview — First 5 rows</span></div>
        <div style={{ overflowX: 'auto' }}>
          {data.preview && data.preview.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.62rem' }}>
              <thead>
                <tr>
                  {Object.keys(data.preview[0]).map(col => (
                    <th key={col} style={{
                      padding: '0.6rem 0.75rem', textAlign: 'left',
                      borderBottom: '1px solid var(--border)', color: 'var(--text-4)',
                      textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.55rem',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{
                        padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)',
                        color: 'var(--text-2)',
                      }}>{typeof val === 'number' ? val.toFixed ? val.toFixed(2) : val : String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
