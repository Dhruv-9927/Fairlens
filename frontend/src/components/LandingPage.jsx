import { useState, useEffect, useRef, useCallback } from 'react'

/* ════════════════════════════════════════════════
   FAIRLENS — Cinematic Landing Page
   Design: Dark editorial with interactive elements
   ════════════════════════════════════════════════ */

// ── Magnetic Button (follows cursor on hover) ──
function MagneticButton({ children, onClick, className = '' }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const handleMouse = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    setPos({ x: (e.clientX - cx) * 0.15, y: (e.clientY - cy) * 0.15 })
  }

  return (
    <button
      ref={ref}
      className={`magnetic-btn ${className}`}
      onClick={onClick}
      onMouseMove={handleMouse}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {children}
    </button>
  )
}

// ── Morphing blob SVG background ──
function MorphBlob() {
  return (
    <svg className="lp-blob" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(181,255,43,0.07)" />
          <stop offset="100%" stopColor="rgba(34,197,94,0.03)" />
        </linearGradient>
      </defs>
      <path fill="url(#blobGrad)">
        <animate
          attributeName="d"
          dur="12s"
          repeatCount="indefinite"
          values="
            M300,300 C380,200 500,250 480,350 C460,450 380,500 300,480 C220,460 140,400 160,300 C180,200 220,400 300,300;
            M300,300 C420,220 480,300 450,400 C420,500 350,520 280,490 C210,460 150,380 180,280 C210,180 180,380 300,300;
            M300,300 C360,180 520,220 500,340 C480,460 400,510 310,500 C220,490 130,420 140,310 C150,200 240,420 300,300;
            M300,300 C380,200 500,250 480,350 C460,450 380,500 300,480 C220,460 140,400 160,300 C180,200 220,400 300,300
          "
        />
      </path>
    </svg>
  )
}

// ── Interactive grid that responds to mouse ──
function InteractiveGrid() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouse)

    const spacing = 50
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          const dx = x - mx
          const dy = y - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 200
          const influence = Math.max(0, 1 - dist / maxDist)

          const size = 1 + influence * 3
          const alpha = 0.06 + influence * 0.25

          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fillStyle = influence > 0
            ? `rgba(181, 255, 43, ${alpha})`
            : `rgba(255, 255, 255, ${alpha})`
          ctx.fill()
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  return <canvas ref={canvasRef} className="lp-grid-canvas" />
}

// ── Animated counter ──
function AnimCount({ to, suffix = '', color, delay = 0 }) {
  const [val, setVal] = useState(0)
  const [go, setGo] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setGo(true), delay); obs.disconnect() }
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [delay])

  useEffect(() => {
    if (!go) return
    let start = null
    const dur = 1800
    const tick = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      setVal(Math.round(to * ease))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [go, to])

  return <span ref={ref} style={{ color }}>{val}{suffix}</span>
}

// ── Reveal on scroll wrapper ──
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`lp-reveal ${vis ? 'visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// ── Text scramble effect ──
function ScrambleText({ text, delay = 0 }) {
  const [display, setDisplay] = useState('')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'

  useEffect(() => {
    const timer = setTimeout(() => {
      let iteration = 0
      const interval = setInterval(() => {
        setDisplay(
          text.split('').map((char, i) => {
            if (char === ' ') return ' '
            if (i < iteration) return text[i]
            return chars[Math.floor(Math.random() * chars.length)]
          }).join('')
        )
        iteration += 0.8
        if (iteration >= text.length) {
          setDisplay(text)
          clearInterval(interval)
        }
      }, 35)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timer)
  }, [text, delay])

  return <span>{display || '\u00A0'}</span>
}

// ══════════════════════════════════════
//  MAIN LANDING PAGE
// ══════════════════════════════════════

const CAPABILITIES = [
  { num: '01', title: 'Detect', desc: 'Disparate impact analysis across gender, race, age. Heatmaps expose hidden patterns.', accent: 'var(--red)' },
  { num: '02', title: 'Explain', desc: 'Counterfactual stories — "If Maria were male, her acceptance jumps from 22% to 57%."', accent: 'var(--amber)' },
  { num: '03', title: 'Simulate', desc: 'What-If sliders let you tune thresholds and watch fairness shift in real-time.', accent: 'var(--blue)' },
  { num: '04', title: 'Fix', desc: 'One-click reweighting/resampling mitigation with before-after comparison.', accent: 'var(--green)' },
  { num: '05', title: 'Comply', desc: 'Automated checks against EEOC, ECOA, ADEA, HHS — 9 legal frameworks.', accent: 'var(--lime)' },
  { num: '06', title: 'Monitor', desc: 'Live production monitoring with drift detection and automated alerting.', accent: '#a78bfa' },
]

export default function LandingPage({ onLaunchApp }) {
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [mouseTrail, setMouseTrail] = useState([])

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="lp">
      <InteractiveGrid />
      <MorphBlob />

      {/* ═══ HERO ═══ */}
      <section className="lp-hero">
        {/* Top bar */}
        <div className={`lp-topbar ${heroLoaded ? 'show' : ''}`}>
          <div className="lp-logo">
            <div className="lp-logo-mark">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="12" stroke="#b5ff2b" strokeWidth="1.5" fill="none" />
                <circle cx="14" cy="14" r="5" fill="#b5ff2b" />
                <line x1="14" y1="2" x2="14" y2="8" stroke="#b5ff2b" strokeWidth="1.5" />
                <line x1="14" y1="20" x2="14" y2="26" stroke="#b5ff2b" strokeWidth="1.5" />
                <line x1="2" y1="14" x2="8" y2="14" stroke="#b5ff2b" strokeWidth="1.5" />
                <line x1="20" y1="14" x2="26" y2="14" stroke="#b5ff2b" strokeWidth="1.5" />
              </svg>
            </div>
            <span className="lp-logo-text">FairLens</span>
          </div>
          <div className="lp-topbar-right">
            <span className="lp-topbar-tag">AI Bias Detection</span>
            <span className="lp-topbar-tag">Hackathon 2025</span>
          </div>
        </div>

        {/* Giant headline */}
        <div className="lp-hero-content">
          <div className={`lp-hero-label ${heroLoaded ? 'show' : ''}`}>
            <div className="lp-pulse" />
            <ScrambleText text="ALGORITHMIC FAIRNESS ENGINE" delay={500} />
          </div>

          <h1 className={`lp-hero-h1 ${heroLoaded ? 'show' : ''}`}>
            <span className="lp-hero-line lp-hero-line-1">Your AI is</span>
            <span className="lp-hero-line lp-hero-line-2">
              biased<span className="lp-hero-period">.</span>
            </span>
            <span className="lp-hero-line lp-hero-line-3">
              We <span className="lp-hero-highlight">prove it.</span>
            </span>
          </h1>

          <p className={`lp-hero-sub ${heroLoaded ? 'show' : ''}`}>
            Upload a dataset. Get a full bias audit in 10 seconds.<br />
            Gender. Race. Age. Intersectional. With legal compliance checks.
          </p>

          <div className={`lp-hero-actions ${heroLoaded ? 'show' : ''}`}>
            <MagneticButton onClick={onLaunchApp} className="lp-cta-primary">
              <span>Launch FairLens</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </MagneticButton>
            <span className="lp-cta-note">No signup · No API key · Just drop a CSV</span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={`lp-scroll-cue ${heroLoaded ? 'show' : ''}`}>
          <div className="lp-scroll-track">
            <div className="lp-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="lp-stats-bar">
        <Reveal><div className="lp-stat">
          <div className="lp-stat-num"><AnimCount to={15} suffix="%" color="var(--red)" /></div>
          <div className="lp-stat-label">Fairness before</div>
        </div></Reveal>
        <div className="lp-stat-arrow">→</div>
        <Reveal delay={150}><div className="lp-stat">
          <div className="lp-stat-num"><AnimCount to={85} suffix="%" color="var(--green)" delay={200} /></div>
          <div className="lp-stat-label">Fairness after</div>
        </div></Reveal>
        <div className="lp-stat-sep" />
        <Reveal delay={300}><div className="lp-stat">
          <div className="lp-stat-num"><AnimCount to={10} suffix="s" color="var(--lime)" delay={400} /></div>
          <div className="lp-stat-label">Full audit time</div>
        </div></Reveal>
        <div className="lp-stat-sep" />
        <Reveal delay={450}><div className="lp-stat">
          <div className="lp-stat-num"><AnimCount to={9} suffix="" color="var(--blue)" delay={600} /></div>
          <div className="lp-stat-label">Legal frameworks</div>
        </div></Reveal>
      </section>

      {/* ═══ THE PROBLEM ═══ */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <Reveal>
            <div className="lp-section-label">The Problem</div>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="lp-section-h2">
              In 2018, Amazon discovered their AI hiring tool<br />
              <span style={{ color: 'var(--red)' }}>systematically penalized women.</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="lp-section-p">
              They scrapped the entire system. But most companies don't even know their models are biased.
              FairLens catches what humans miss — instantly, automatically, with legal-grade evidence.
            </p>
          </Reveal>

          {/* Animated discrimination example */}
          <Reveal delay={300}>
            <div className="lp-demo-card">
              <div className="lp-demo-header">
                <span className="lp-demo-tag">LIVE EXAMPLE</span>
                <span style={{ color: 'var(--text-4)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>hiring_data.csv</span>
              </div>
              <div className="lp-demo-rows">
                <div className="lp-demo-row">
                  <span className="lp-demo-name">James Wilson</span>
                  <span className="lp-demo-attr">Male · 34 · MBA</span>
                  <span className="lp-demo-result lp-demo-accepted">ACCEPTED</span>
                </div>
                <div className="lp-demo-row lp-demo-row-flagged">
                  <span className="lp-demo-name">Sarah Chen</span>
                  <span className="lp-demo-attr">Female · 32 · MBA</span>
                  <span className="lp-demo-result lp-demo-rejected">REJECTED</span>
                  <div className="lp-demo-flag">⚠ Bias detected — same qualifications, different outcome</div>
                </div>
                <div className="lp-demo-row">
                  <span className="lp-demo-name">Michael Brown</span>
                  <span className="lp-demo-attr">Male · 29 · BS</span>
                  <span className="lp-demo-result lp-demo-accepted">ACCEPTED</span>
                </div>
                <div className="lp-demo-row lp-demo-row-flagged">
                  <span className="lp-demo-name">Priya Patel</span>
                  <span className="lp-demo-attr">Female · 28 · BS</span>
                  <span className="lp-demo-result lp-demo-rejected">REJECTED</span>
                  <div className="lp-demo-flag">⚠ Disparate impact ratio: 0.24 — violates 4/5ths rule</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ CAPABILITIES ═══ */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <Reveal><div className="lp-section-label">Platform</div></Reveal>
          <Reveal delay={100}>
            <h2 className="lp-section-h2">
              Six tools.<br />
              <span style={{ color: 'var(--lime)' }}>One command center.</span>
            </h2>
          </Reveal>

          <div className="lp-cap-grid">
            {CAPABILITIES.map((c, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="lp-cap-card">
                  <div className="lp-cap-num" style={{ color: c.accent }}>{c.num}</div>
                  <div className="lp-cap-title">{c.title}</div>
                  <div className="lp-cap-desc">{c.desc}</div>
                  <div className="lp-cap-line" style={{ background: c.accent }} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <Reveal><div className="lp-section-label">Workflow</div></Reveal>
          <Reveal delay={100}>
            <h2 className="lp-section-h2">Three steps to fair AI</h2>
          </Reveal>

          <div className="lp-steps">
            {[
              { n: '01', t: 'Upload', d: 'Drop any CSV with demographic columns. We auto-detect protected attributes.', icon: '↑' },
              { n: '02', t: 'Audit', d: 'Full disparate impact analysis, intersectional breakdown, model feature importance.', icon: '◉' },
              { n: '03', t: 'Mitigate', d: 'One-click reweighting with live before/after comparison. Download the report.', icon: '✓' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 150}>
                <div className="lp-step">
                  <div className="lp-step-n">{s.n}</div>
                  <div className="lp-step-icon">{s.icon}</div>
                  <h3 className="lp-step-t">{s.t}</h3>
                  <p className="lp-step-d">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TECH STACK ═══ */}
      <section className="lp-section lp-section-dark">
        <div className="lp-section-inner">
          <Reveal><div className="lp-section-label">Built With</div></Reveal>
          <Reveal delay={100}>
            <div className="lp-tech-row">
              {['React', 'FastAPI', 'Gemini 2.0 Flash', 'Recharts', 'Python', 'scikit-learn'].map((t, i) => (
                <span key={i} className="lp-tech-pill">{t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="lp-section lp-cta-section">
        <div className="lp-section-inner" style={{ textAlign: 'center' }}>
          <Reveal>
            <h2 className="lp-section-h2" style={{ maxWidth: 600, margin: '0 auto' }}>
              Ready to see what your<br />
              <span style={{ color: 'var(--lime)' }}>AI is hiding?</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <div style={{ marginTop: '2.5rem' }}>
              <MagneticButton onClick={onLaunchApp} className="lp-cta-primary lp-cta-big">
                <span>Launch FairLens</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </MagneticButton>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <p className="lp-footer-note">
              Powered by Google Gemini · Built for Hackathon 2025
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
