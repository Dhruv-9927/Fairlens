import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { monitorPredictions } from '../api'

// Bug 4 fix: Generate 5 minutes of realistic simulated history
function generateHistory() {
  const data = []
  const now = Date.now()
  const fiveMinAgo = now - 5 * 60 * 1000
  const interval = 10000 // 10 second intervals = 30 data points

  for (let t = fiveMinAgo; t < now; t += interval) {
    const date = new Date(t)
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    const timeLabel = `${date.getHours()}:${minutes}:${seconds}`

    // Realistic fairness that hovers around 85-95% with occasional dips
    const base = 88 + Math.sin(t / 30000) * 4
    const noise = (Math.random() - 0.5) * 6
    const fairness = Math.min(100, Math.max(70, base + noise))

    data.push({
      time: timeLabel,
      fairness: Math.round(fairness * 10) / 10,
      disparateImpact: Math.round((fairness * 0.95 + Math.random() * 5) * 10) / 10,
    })
  }
  return data
}

export default function MonitorDashboard() {
  const [history, setHistory] = useState(() => generateHistory())
  const [alerts, setAlerts] = useState([
    {
      time: new Date(Date.now() - 180000).toLocaleTimeString(),
      severity: 'WARNING',
      message: 'Fairness score dipped to 82% — approaching threshold',
    },
    {
      time: new Date(Date.now() - 240000).toLocaleTimeString(),
      severity: 'INFO',
      message: 'Monitoring resumed after scheduled maintenance window',
    },
  ])
  const [isMonitoring, setIsMonitoring] = useState(true) // Start running by default
  const intervalRef = useRef(null)

  const simulateBatch = async (biased = false) => {
    const groups = ['Male', 'Female', 'Male', 'Female', 'Male', 'Female', 'Male', 'Female', 'Male', 'Female']

    let predictions
    if (biased) {
      predictions = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    } else {
      predictions = groups.map(() => Math.random() > 0.45 ? 1 : 0)
    }

    try {
      const res = await monitorPredictions(predictions, groups, 'gender')
      const entry = res.current

      const now = new Date()
      const timeLabel = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

      setHistory(prev => [...prev.slice(-60), {
        time: timeLabel,
        fairness: Math.round(entry.fairness_score * 1000) / 10,
        disparateImpact: Math.round(entry.disparate_impact * 1000) / 10,
      }])

      if (entry.alert) {
        setAlerts(prev => [{
          time: now.toLocaleTimeString(),
          severity: entry.alert.severity,
          message: entry.alert.message,
        }, ...prev.slice(0, 19)])
      }
    } catch (e) {
      console.error('Monitor error:', e)
    }
  }

  useEffect(() => {
    // Auto-start monitoring
    intervalRef.current = setInterval(() => {
      simulateBatch(false)
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const stopMonitoring = () => {
    setIsMonitoring(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const startMonitoring = () => {
    setIsMonitoring(true)
    intervalRef.current = setInterval(() => {
      simulateBatch(false)
    }, 3000)
  }

  const injectBiasedBatch = () => {
    simulateBatch(true)
    setTimeout(() => simulateBatch(true), 500)
    setTimeout(() => simulateBatch(true), 1000)
    setTimeout(() => simulateBatch(true), 1500)
  }

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Production Monitoring</div>
          <h2 className="section-title">Live Fairness Monitor</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isMonitoring ? (
            <button className="btn btn-outline btn-sm" onClick={stopMonitoring}>
              Pause
            </button>
          ) : (
            <button className="btn btn-success btn-sm" onClick={startMonitoring}>
              Resume
            </button>
          )}
          <button
            className="btn btn-danger btn-sm"
            onClick={injectBiasedBatch}
          >
            Inject Biased Batch
          </button>
        </div>
      </div>

      {isMonitoring && (
        <div className="alert-banner success" style={{ marginBottom: '1rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse-dot 2s ease infinite' }} />
          <span style={{ fontSize: '0.78rem' }}>Monitoring active — batch every 3s — {history.length} data points collected</span>
        </div>
      )}

      <div className="monitor-grid">
        {/* Chart */}
        <div>
          <div className="card-title">Fairness Score Over Time</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            Red line = 80% threshold (four-fifths rule)
          </div>
          <div style={{ height: 350, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#666', fontSize: 9 }}
                  interval={Math.max(0, Math.floor(history.length / 8))}
                />
                <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#161616', border: '1px solid #2a2a2a', fontSize: '0.78rem' }} />
                <ReferenceLine y={80} stroke="#ff3b3b" strokeDasharray="5 5" label={{ value: '80% threshold', fill: '#ff3b3b', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="fairness"
                  stroke="var(--lime)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--lime)' }}
                  name="Fairness %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts Panel */}
        <div>
          <div className="card-title">
            Alerts
            {alerts.length > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 8 }}>{alerts.length}</span>
            )}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            Bias drift notifications
          </div>

          <div className="alert-list" style={{ marginTop: '1rem' }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-3)', fontSize: '0.75rem' }}>
                No alerts — inject a biased batch to test
              </div>
            ) : (
              alerts.map((alert, i) => (
                <div
                  className="alert-item"
                  key={i}
                  style={{
                    borderLeft: `3px solid ${alert.severity === 'CRITICAL' ? 'var(--red)' : alert.severity === 'WARNING' ? 'var(--amber)' : 'var(--blue)'}`,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.72rem', color: alert.severity === 'CRITICAL' ? '#ff8080' : alert.severity === 'WARNING' ? '#ffcc66' : 'var(--text-2)' }}>
                    {alert.severity}
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: '0.72rem', marginTop: 2 }}>
                    {alert.message}
                  </div>
                  <div className="alert-time">{alert.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
