import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

export default function BiasFingerprint({ results }) {
  const fingerprint = results?.fingerprint?.fingerprint_axes
  if (!fingerprint || fingerprint.length === 0) return null

  const chartData = fingerprint.map(axis => ({
    axis: axis.axis,
    biasSeverity: Math.round(axis.bias_severity * 100),
    fairnessScore: Math.round(axis.fairness_score * 100),
    parityGap: Math.round(axis.parity_gap * 100),
    disparateImpact: Math.round(axis.disparate_impact * 100),
  }))

  return (
    <div className="card animate-slide-up">
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🧬 Bias Fingerprint
        <span className="badge badge-info">Unique to this dataset</span>
      </div>
      <div className="card-subtitle">
        A radial signature of bias patterns — each axis represents a fairness dimension
      </div>

      <div className="fingerprint-container" style={{ position: 'relative' }}>
        {/* Glow effect behind chart */}
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.05) 50%, transparent 70%)',
          filter: 'blur(30px)',
          animation: 'heroGlow 6s ease-in-out infinite alternate',
        }} />

        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: '0.8rem',
              }}
              formatter={(value, name) => {
                const labels = {
                  biasSeverity: 'Bias Severity',
                  fairnessScore: 'Fairness Score', 
                  parityGap: 'Parity Gap',
                }
                return [`${value}%`, labels[name] || name]
              }}
            />
            <Radar
              name="biasSeverity"
              dataKey="biasSeverity"
              stroke="#fb7185"
              fill="#fb7185"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Radar
              name="fairnessScore"
              dataKey="fairnessScore"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Radar
              name="parityGap"
              dataKey="parityGap"
              stroke="#22d3ee"
              fill="#22d3ee"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        marginTop: '0.5rem',
        fontSize: '0.8rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#fb7185' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Bias Severity</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#6366f1' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Fairness Score</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#22d3ee' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Parity Gap</span>
        </div>
      </div>
    </div>
  )
}
