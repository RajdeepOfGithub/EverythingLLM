import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useInView,
} from 'framer-motion'
import { Brain, Server, Activity, Zap, CheckCircle } from 'lucide-react'
import { useTypewriter } from '../hooks/useTypewriter'
import './HomePage.css'

// ── Data ──────────────────────────────────────────────────────────────────────

const STAGES = [
  {
    phase: '01',
    title: 'Model\nRecommender',
    desc: 'Hardware-aware model scoring',
    icon: Brain,
    status: 'active' as const,
    route: '/models',
  },
  {
    phase: '02',
    title: 'Hardware\nPlanner',
    desc: 'VRAM & cost calculator',
    icon: Server,
    status: 'soon' as const,
    route: '/hardware',
  },
  {
    phase: '03',
    title: 'Throughput\nBenchmarker',
    desc: 'llama.cpp sweep runner',
    icon: Activity,
    status: 'soon' as const,
    route: '/benchmark',
  },
  {
    phase: '04',
    title: 'Speculative\nDecoding',
    desc: 'Draft model advisor',
    icon: Zap,
    status: 'soon' as const,
    route: '/speculative',
  },
  {
    phase: '✓',
    title: 'Optimized\nInference',
    desc: 'Peak performance achieved',
    icon: CheckCircle,
    status: 'goal' as const,
    route: null,
  },
]

const MODULES = [
  {
    phase: 'Phase 01',
    icon: Brain,
    name: 'Model Recommender',
    desc: 'Select the best model for your use case. Weighted scoring across quality, speed, VRAM fit, and context length — calibrated to your hardware.',
    status: 'active' as const,
    color: 'var(--violet)',
  },
  {
    phase: 'Phase 02',
    icon: Server,
    name: 'Hardware Planner',
    desc: 'Calculate exact VRAM and RAM requirements. Get buy-vs-rent cost estimates before committing to hardware.',
    status: 'soon' as const,
    color: 'var(--text-dim)',
  },
  {
    phase: 'Phase 03',
    icon: Activity,
    name: 'Throughput Benchmarker',
    desc: 'Connect your local agent, run llama.cpp parameter sweeps, and visualize real throughput curves on your own machine.',
    status: 'soon' as const,
    color: 'var(--text-dim)',
  },
  {
    phase: 'Phase 04',
    icon: Zap,
    name: 'Speculative Decoding',
    desc: 'Find the best draft model pairing for your target. Live benchmarking with an animated concept explainer.',
    status: 'soon' as const,
    color: 'var(--text-dim)',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function HomeNav() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      className={`home-nav${scrolled ? ' scrolled' : ''}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <span className="home-nav-brand">EverythingLLM</span>
      <button
        className="home-nav-signin"
        onClick={() => navigate('/login')}
      >
        Sign In →
      </button>
    </motion.nav>
  )
}

function HeroSection() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const { displayed: cmdText, done: cmdDone } = useTypewriter(
    '> everythingllm --start',
    { speed: 38 }
  )
  const { displayed: headLine1, done: head1Done } = useTypewriter(
    cmdDone ? 'OPTIMIZE YOUR LLM.' : '',
    { speed: 26, delay: 200 }
  )
  const { displayed: headLine2, done: head2Done } = useTypewriter(
    head1Done ? 'EVERY STEP.' : '',
    { speed: 26, delay: 100 }
  )

  const scrollToPipeline = () => {
    document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="hero-section">
      <div className="hero-grid-bg" />
      <div className="hero-vignette" />
      <div className="hero-scan-line" />

      <div className="hero-content">
        <div className="hero-cmd-line">
          <span>{cmdText}</span>
          {!cmdDone && <span className="tw-cursor">_</span>}
        </div>

        <div className="hero-headline-wrap">
          <h1 className="hero-headline-1">
            {headLine1 || (cmdDone ? '\u00A0' : '')}
            {cmdDone && !head1Done && <span className="tw-cursor">_</span>}
          </h1>
          <h1 className="hero-headline-2">
            {headLine2}
            {head1Done && !head2Done && <span className="tw-cursor">_</span>}
          </h1>
        </div>

        <motion.div
          className="hero-subtitle"
          animate={{ opacity: head2Done ? 1 : 0, y: head2Done ? 0 : 10 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <p>
            Model selection → Hardware planning → Benchmarking → Speculative
            decoding.
          </p>
          <p>One platform, four tools, zero guesswork.</p>
        </motion.div>

        <motion.div
          className="hero-ctas"
          animate={{ opacity: head2Done ? 1 : 0, y: head2Done ? 0 : 10 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.button
            className="hero-cta-primary"
            onClick={() => navigate('/login')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Started →
          </motion.button>
          <motion.button
            className="hero-cta-secondary"
            onClick={scrollToPipeline}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View Pipeline ↓
          </motion.button>
        </motion.div>
      </div>

      <AnimatePresence>
        {!scrolled && (
          <motion.div
            className="hero-scroll-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 6, 0] }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.4 },
              y: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
            }}
          >
            ↓ SCROLL
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

interface PipelineConnectorProps {
  index: number
  inView: boolean
}

function PipelineConnector({ index, inView }: PipelineConnectorProps) {
  return (
    <div className="pipeline-connector">
      <svg viewBox="0 0 80 40" width="80" height="40" overflow="visible">
        <defs>
          <marker
            id={`arrow-${index}`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path
              d="M 0,0 L 6,3 L 0,6 Z"
              fill="rgba(255,230,0,0.5)"
            />
          </marker>
        </defs>
        <motion.path
          d="M 4,20 Q 40,6 76,20"
          stroke="rgba(255,230,0,0.4)"
          strokeWidth="1.5"
          fill="none"
          markerEnd={`url(#arrow-${index})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={inView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{
            delay: 0.4 + index * 0.18,
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
        <motion.circle
          cx="76"
          cy="20"
          r="3"
          fill="rgba(255,230,0,0.6)"
          initial={{ opacity: 0, scale: 1 }}
          animate={
            inView
              ? {
                  opacity: [0, 1, 1, 0.6],
                  scale: [1, 1, 1.5, 1],
                }
              : {}
          }
          transition={{
            delay: 0.9 + index * 0.18,
            duration: 1,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        />
      </svg>
    </div>
  )
}

function PipelineSection() {
  const navigate = useNavigate()
  const pipelineRef = useRef<HTMLDivElement>(null)
  const pipelineInView = useInView(pipelineRef, { once: true, margin: '-80px' })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section className="pipeline-section" id="pipeline">
      <div className="section-header">
        <div className="section-rule">
          <span className="section-rule-line" />
          <span className="section-title">THE PIPELINE</span>
          <span className="section-rule-line section-rule-line--long" />
        </div>
        <p className="section-subtitle">
          From use case to optimized inference
        </p>
      </div>

      <div className="pipeline-flow" ref={pipelineRef}>
        {STAGES.map((stage, i) => {
          const Icon = stage.icon
          const isActive = stage.status === 'active'
          const isGoal = stage.status === 'goal'
          const isSoon = stage.status === 'soon'

          return (
            <React.Fragment key={stage.phase}>
              <motion.div
                className={`pipeline-node pipeline-node--${stage.status}`}
                initial={{ opacity: 0, y: 30 }}
                animate={pipelineInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: i * 0.12,
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1],
                }}
                whileHover={isActive ? { scale: 1.04, y: -4 } : {}}
                onClick={() => isActive && stage.route && navigate(stage.route)}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: isActive ? 'pointer' : 'default' }}
              >
                {isSoon && <span className="node-soon-badge">SOON</span>}

                <div className="node-phase-label">
                  PHASE {stage.phase}
                  <span className="node-phase-accent" />
                </div>

                <div
                  className="node-icon"
                  style={{
                    color: isActive
                      ? 'var(--violet)'
                      : isGoal
                      ? 'var(--green)'
                      : 'var(--muted)',
                  }}
                >
                  <Icon size={24} strokeWidth={1.5} />
                </div>

                <div className="node-title">
                  {stage.title.split('\n').map((line, li) => (
                    <span key={li} className="node-title-line">
                      {line}
                    </span>
                  ))}
                </div>

                <p className="node-desc">{stage.desc}</p>

                <div className="node-status-badge">
                  {isActive && (
                    <span className="badge badge--active">● ACTIVE</span>
                  )}
                  {isSoon && (
                    <span className="badge badge--soon">◎ COMING SOON</span>
                  )}
                  {isGoal && (
                    <span className="badge badge--goal">★ YOUR GOAL</span>
                  )}
                </div>

                {isActive && (
                  <AnimatePresence>
                    {hoveredIndex === i && (
                      <motion.div
                        className="node-tooltip"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                      >
                        Launch tool →
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </motion.div>

              {i < STAGES.length - 1 && (
                <PipelineConnector index={i} inView={pipelineInView} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </section>
  )
}

function ModulesSection() {
  return (
    <section className="modules-section">
      <div className="section-header">
        <div className="section-rule">
          <span className="section-rule-line" />
          <span className="section-title">WHAT'S INSIDE</span>
          <span className="section-rule-line section-rule-line--long" />
        </div>
      </div>

      <div className="modules-grid">
        {MODULES.map((mod, i) => {
          const Icon = mod.icon
          return (
            <motion.div
              key={mod.name}
              className={`module-card module-card--${mod.status}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.1 + 0.2,
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1],
              }}
              whileHover={{ scale: 1.02, y: -3 }}
            >
              <span className="module-phase">{mod.phase}</span>
              <div className="module-icon" style={{ color: mod.color }}>
                <Icon size={28} strokeWidth={1.5} />
              </div>
              <h3 className="module-name">{mod.name}</h3>
              <p className="module-desc">{mod.desc}</p>
              <div className="module-status">
                {mod.status === 'active' ? (
                  <span className="badge badge--active">● ACTIVE</span>
                ) : (
                  <span className="badge badge--soon">◎ COMING SOON</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

function CtaSection() {
  const navigate = useNavigate()

  return (
    <motion.section
      className="cta-section"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="cta-terminal-prompt">{'>'} READY TO OPTIMIZE?</div>
      <p className="cta-subtitle">
        Start with Model Recommender — live now.
      </p>
      <p className="cta-subtitle cta-subtitle--dim">
        Hardware Planner, Benchmarker &amp; Speculative Decoding launching soon.
      </p>
      <motion.button
        className="cta-btn-primary"
        onClick={() => navigate('/login')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Sign In &amp; Get Started →
      </motion.button>
    </motion.section>
  )
}

function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="footer-left">
        <span className="footer-brand">EverythingLLM</span>
        <span className="footer-tagline">Built for ML Engineers</span>
      </div>
      <div className="footer-right">
        <a
          href="https://github.com/RajdeepOfGithub/EverythingLLM"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-github"
        >
          GitHub ↗
        </a>
      </div>
    </footer>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="home-page">
        <HomeNav />
        <HeroSection />
        <PipelineSection />
        <ModulesSection />
        <CtaSection />
        <HomeFooter />
      </div>
    </MotionConfig>
  )
}
