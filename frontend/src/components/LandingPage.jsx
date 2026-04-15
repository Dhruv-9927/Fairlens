import { useState, useEffect, useRef } from 'react'

// Animated counter that counts up from 0 to target
function Counter({ target, suffix = '', duration = 2000, delay = 0, color }) {
  const [value, setValue] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (!started) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [started, target, duration])

  return (
    <span style={{ color: color || 'inherit', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
      {value}{suffix}
    </span>
  )
}

// Typewriter text effect
function Typewriter({ text, speed = 40, delay = 0 }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (!started) return
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [started, text, speed])

  return (
    <span>
      {displayed}
      <span className="landing-cursor">|</span>
    </span>
  )
}

// Floating particles background
function Particles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationId
    let particles = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.05,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(181, 255, 43, ${p.opacity})`
        ctx.fill()
      })

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(181, 255, 43, ${0.03 * (1 - dist / 150)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="landing-particles" />
}

const FEATURES = [
  {
    icon: '🔍',
    title: 'Bias Detection',
    desc: 'Automated detection of gender, race, and age bias using disparate impact analysis',
    stat: '4/5ths rule',
  },
  {
    icon: '🎛️',
    title: 'What-If Simulator',
    desc: 'Drag a slider and watch fairness metrics change in real-time',
    stat: 'Interactive',
  },
  {
    icon: '👤',
    title: 'Counterfactual Stories',
    desc: '"If Lisa were male, her acceptance would jump from 22% to 57%"',
    stat: 'Individual-level',
  },
  {
    icon: '🔴',
    title: 'Red Team Mode',
    desc: 'Inject bias and watch FairLens catch it in under 3 seconds',
    stat: '< 3s detection',
  },
  {
    icon: '⚖️',
    title: 'Compliance Scanner',
    desc: 'Automated checks against EEOC, ECOA, ADEA, and HHS regulations',
    stat: '9 legal codes',
  },
  {
    icon: '📡',
    title: 'Live Monitoring',
    desc: 'Real-time production monitoring with drift detection and alerting',
    stat: '24/7 watch',
  },
]

const TIMELINE = [
  { year: '2018', event: 'Amazon scraps AI hiring tool after discovering it penalized women', color: 'var(--red)' },
  { year: '2019', event: 'Apple Card investigated for gender discrimination in credit limits', color: 'var(--amber)' },
  { year: '2020', event: 'UK exam algorithm criticized for downgrading disadvantaged students', color: 'var(--amber)' },
  { year: '2023', event: 'EU AI Act mandates algorithmic fairness audits for high-risk systems', color: 'var(--blue)' },
  { year: '2025', event: 'FairLens: Automated bias detection that catches what humans miss', color: 'var(--lime)' },
]

export default function LandingPage({ onLaunchApp }) {
  const [scrollY, setScrollY] = useState(0)
  const [visibleSections, setVisibleSections] = useState(new Set())
  const sectionRefs = useRef({})

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]))
          }
        })
      },
      { threshold: 0.15 }
    )

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const isVisible = (id) => visibleSections.has(id)

  return (
    <div className="landing">
      <Particles />

      {/* ── HERO ──────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          {/* Logo */}
          <div className="landing-logo-row" style={{ animationDelay: '0.2s' }}>
            <img src="/logo.png" alt="FairLens" className="landing-logo-img" />
            <span className="landing-logo-name">FairLens</span>
          </div>

          {/* Headline with staggered reveal */}
          <h1 className="landing-headline">
            <span className="landing-headline-line" style={{ animationDelay: '0.5s' }}>
              AI shouldn't
            </span>
            <span className="landing-headline-line" style={{ animationDelay: '0.7s' }}>
              discriminate.
            </span>
            <span className="landing-headline-accent" style={{ animationDelay: '0.9s' }}>
              Now it can't.
            </span>
          </h1>

          <p className="landing-sub" style={{ animationDelay: '1.1s' }}>
            <Typewriter
              text="Upload any dataset. Detect bias in seconds. Fix it in one click."
              delay={1200}
              speed={30}
            />
          </p>

          {/* CTA */}
          <div className="landing-cta-row" style={{ animationDelay: '1.5s' }}>
            <button className="landing-cta" onClick={onLaunchApp}>
              Launch App
              <span className="landing-cta-arrow">→</span>
            </button>
            <span className="landing-cta-hint">No login required · Drop a CSV to start</span>
          </div>

          {/* Scrolling stats ticker */}
          <div className="landing-stats-row" style={{ animationDelay: '2s' }}>
            <div className="landing-stat">
              <div className="landing-stat-value">
                <Counter target={15} suffix="%" delay={2200} color="var(--red)" />
              </div>
              <div className="landing-stat-label">Fairness on biased data</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value">
                <Counter target={85} suffix="%" delay={2400} color="var(--green)" />
              </div>
              <div className="landing-stat-label">After FairLens mitigation</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value">
                <Counter target={3} suffix="s" delay={2600} color="var(--lime)" />
              </div>
              <div className="landing-stat-label">Bias detection time</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="landing-scroll-hint">
          <span>Scroll to explore</span>
          <div className="landing-scroll-line" />
        </div>
      </section>

      {/* ── PROBLEM STATEMENT ────────────── */}
      <section
        className={`landing-section ${isVisible('problem') ? 'visible' : ''}`}
        id="problem"
        ref={el => sectionRefs.current['problem'] = el}
      >
        <div className="landing-section-inner">
          <div className="landing-section-eyebrow">The Problem</div>
          <h2 className="landing-section-title">
            AI is making decisions about<br />
            <span style={{ color: 'var(--red)' }}>who gets hired, who gets a loan,</span><br />
            and who gets medical care.
          </h2>
          <p className="landing-section-desc">
            But these systems inherit the biases of their training data.
            Without rigorous auditing, discrimination scales at the speed of silicon.
          </p>
        </div>
      </section>

      {/* ── TIMELINE ─────────────────────── */}
      <section
        className={`landing-section ${isVisible('timeline') ? 'visible' : ''}`}
        id="timeline"
        ref={el => sectionRefs.current['timeline'] = el}
      >
        <div className="landing-section-inner">
          <div className="landing-section-eyebrow">A Brief History of AI Bias</div>
          <div className="landing-timeline">
            {TIMELINE.map((item, i) => (
              <div
                className="landing-timeline-item"
                key={i}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="landing-timeline-year" style={{ color: item.color }}>{item.year}</div>
                <div className="landing-timeline-dot" style={{ background: item.color }} />
                <div className="landing-timeline-text">{item.event}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────── */}
      <section
        className={`landing-section ${isVisible('features') ? 'visible' : ''}`}
        id="features"
        ref={el => sectionRefs.current['features'] = el}
      >
        <div className="landing-section-inner">
          <div className="landing-section-eyebrow">Capabilities</div>
          <h2 className="landing-section-title">
            6 tools.<br />
            <span style={{ color: 'var(--lime)' }}>Zero blind spots.</span>
          </h2>

          <div className="landing-features-grid">
            {FEATURES.map((f, i) => (
              <div className="landing-feature-card" key={i} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="landing-feature-icon">{f.icon}</div>
                <div className="landing-feature-title">{f.title}</div>
                <div className="landing-feature-desc">{f.desc}</div>
                <div className="landing-feature-stat">{f.stat}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────── */}
      <section
        className={`landing-section ${isVisible('how') ? 'visible' : ''}`}
        id="how"
        ref={el => sectionRefs.current['how'] = el}
      >
        <div className="landing-section-inner">
          <div className="landing-section-eyebrow">How It Works</div>
          <h2 className="landing-section-title">Three steps to fair AI</h2>

          <div className="landing-steps">
            {[
              { num: '01', title: 'Upload', desc: 'Drop any CSV dataset with demographic columns', icon: '↑' },
              { num: '02', title: 'Detect', desc: 'FairLens runs disparate impact, intersectional, and model-level analysis', icon: '⚡' },
              { num: '03', title: 'Fix', desc: 'One-click mitigation with before/after comparison', icon: '✓' },
            ].map((step, i) => (
              <div className="landing-step" key={i} style={{ animationDelay: `${i * 200}ms` }}>
                <div className="landing-step-num">{step.num}</div>
                <div className="landing-step-icon">{step.icon}</div>
                <div className="landing-step-title">{step.title}</div>
                <div className="landing-step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────── */}
      <section
        className={`landing-section landing-section-cta ${isVisible('cta') ? 'visible' : ''}`}
        id="cta"
        ref={el => sectionRefs.current['cta'] = el}
      >
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="landing-section-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Ready to audit your AI?
          </h2>
          <p className="landing-section-desc" style={{ maxWidth: 400, margin: '1rem auto 2rem' }}>
            No signup. No API key needed. Just drop your dataset and get results in 10 seconds.
          </p>
          <button className="landing-cta landing-cta-big" onClick={onLaunchApp}>
            Launch FairLens
            <span className="landing-cta-arrow">→</span>
          </button>
          <div style={{ marginTop: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)' }}>
            POWERED BY GOOGLE GEMINI 2.0 FLASH
          </div>
        </div>
      </section>
    </div>
  )
}
