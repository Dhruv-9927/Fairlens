import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { injectBias } from '../api'

export default function AdversarialDemo({ datasetId }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [alertFired, setAlertFired] = useState(false)
  const [countdown, setCountdown] = useState(null)

  const runInjection = async () => {
    setLoading(true)
    setResult(null)
    setAlertFired(false)

    try {
      const res = await injectBias(datasetId)

      // Simulate real-time detection delay
      setCountdown(3)
      let c = 3
      const interval = setInterval(() => {
        c--
        setCountdown(c)
        if (c <= 0) {
          clearInterval(interval)
          setResult(res)
          setAlertFired(true)
          setLoading(false)
        }
      }, 1000)
    } catch (e) {
      alert('Injection failed: ' + e.message)
      setLoading(false)
    }
  }

  const buildComparisonData = () => {
    if (!result) return []
    const data = []
    const orig = result.original_metrics || {}
    const poisoned = result.poisoned_metrics || {}
    for (const attr of Object.keys(orig)) {
      const origGroups = orig[attr]?.group_metrics || {}
      const poisonedGroups = poisoned[attr]?.group_metrics || {}
      for (const group of Object.keys(origGroups)) {
        data.push({
          name: `${group}`,
          original: (origGroups[group]?.positive_rate || 0) * 100,
          poisoned: (poisonedGroups[group]?.positive_rate || 0) * 100,
        })
      }
      break // Just show first attribute for clarity
    }
    return data
  }

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Adversarial Testing</div>
          <h2 className="section-title">Red Team Mode</h2>
        </div>
      </div>

      <div className="alert-banner" style={{
        background: 'rgba(239, 68, 68, 0.05)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: '#fca5a5',
        marginBottom: '1.5rem'
      }}>
        <span style={{ fontSize: '1.5rem' }}>⚔️</span>
        <div>
          <strong>Red Team Challenge</strong>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Click the button to inject hidden bias. FairLens will attempt to detect it automatically.
            Can you sneak bias past our detection engine?
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button
          className="btn btn-danger btn-lg"
          onClick={runInjection}
          disabled={loading}
          style={{ fontSize: '1.1rem', padding: '16px 40px' }}
        >
          {loading ? `⏳ Detecting bias... ${countdown !== null ? countdown + 's' : ''}` : '💉 Inject Bias Now'}
        </button>
      </div>

      {loading && countdown !== null && (
        <div className="animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '5rem',
            fontWeight: 900,
            color: countdown <= 1 ? 'var(--red)' : 'var(--amber)',
            fontFamily: 'var(--font-mono)',
          }}>
            {countdown}
          </div>
          <p style={{ color: 'var(--text-3)', marginTop: '0.5rem' }}>
            FairLens is scanning for anomalies...
          </p>
        </div>
      )}

      {alertFired && result && (
        <div className="stagger-children">
          {/* Alert */}
          <div className="alert-banner critical" style={{
            animation: 'slideInAlert 0.4s ease-out',
            borderWidth: 2,
          }}>
            <span style={{ fontSize: '2rem' }}>🚨</span>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{result.alert.message}</div>
              <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Severity: <strong>{result.alert.severity}</strong> •
                Detected in: <strong>{result.alert.detected_in_seconds}s</strong> •
                Records affected: <strong>{result.injected_bias.records_flipped}</strong>
              </div>
            </div>
          </div>

          {/* Comparison metrics */}
          <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="metric-card">
              <div className="metric-value good" style={{ fontSize: '2rem' }}>
                {Math.round(result.original_fairness * 100)}%
              </div>
              <div className="metric-label">Before Injection</div>
            </div>
            <div className="metric-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="metric-value danger" style={{ fontSize: '2rem' }}>
                {Math.round(result.poisoned_fairness * 100)}%
              </div>
              <div className="metric-label">After Injection</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ color: 'var(--amber)', fontSize: '2rem' }}>
                -{Math.round(result.fairness_drop * 100)}%
              </div>
              <div className="metric-label">Fairness Drop</div>
            </div>
          </div>

          {/* Chart */}
          <div className="card">
            <div className="card-title">Group Acceptance Rates: Before vs After Injection</div>
            <div style={{ height: 300, marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buildComparisonData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#161616', border: '1px solid #2a2a2a' }} />
                  <Bar dataKey="original" name="Original" fill="#22c55e" />
                  <Bar dataKey="poisoned" name="After Injection" fill="#ff3b3b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>FairLens caught the injected bias</div>
            <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
              {result.injected_bias.description}. The system detected the anomaly in {result.alert.detected_in_seconds} seconds.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
