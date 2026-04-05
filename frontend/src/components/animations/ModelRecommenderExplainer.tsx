import { useEffect, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import './ModelRecommenderExplainer.css'

// Node sequence: 0=UseCase, 1=Weights, 2=VramCheck, 3=Score, 4=Ranked
const TOTAL_NODES = 5
const NODE_DELAY_MS = 600
const PAUSE_AFTER_COMPLETE_MS = 1800

const WEIGHT_BARS = [
  { label: 'Quality', pct: 40, color: 'var(--violet)' },
  { label: 'Speed', pct: 30, color: 'var(--blue)' },
  { label: 'Fit', pct: 20, color: 'var(--green)' },
  { label: 'Context', pct: 10, color: 'var(--orange)' },
]

const RANKED_MODELS = [
  { rank: '01', name: 'Llama-3-8B', score: '0.87' },
  { rank: '02', name: 'Mistral-7B', score: '0.74' },
  { rank: '03', name: 'Phi-3-mini', score: '0.61' },
]

function AnimatedScore({ active }: { active: boolean }) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!active) { setVal(0); return }
    let frame = 0
    const total = 40
    const timer = setInterval(() => {
      frame++
      setVal(Math.min(0.87, parseFloat((frame * (0.87 / total)).toFixed(2))))
      if (frame >= total) clearInterval(timer)
    }, 18)
    return () => clearInterval(timer)
  }, [active])

  return <span className="mre-score-num">{val.toFixed(2)}</span>
}

export default function ModelRecommenderExplainer() {
  const [activeNode, setActiveNode] = useState(-1)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timeouts: ReturnType<typeof setTimeout>[] = []

    async function runCycle() {
      setActiveNode(-1)
      for (let i = 0; i < TOTAL_NODES; i++) {
        const t = setTimeout(() => {
          if (!cancelled) setActiveNode(i)
        }, i * NODE_DELAY_MS + 200)
        timeouts.push(t)
      }
      const resetT = setTimeout(() => {
        if (!cancelled) setCycle(c => c + 1)
      }, TOTAL_NODES * NODE_DELAY_MS + PAUSE_AFTER_COMPLETE_MS)
      timeouts.push(resetT)
    }

    runCycle()
    return () => {
      cancelled = true
      timeouts.forEach(clearTimeout)
    }
  }, [cycle])

  const lit = (n: number) => activeNode >= n

  return (
    <MotionConfig reducedMotion="user">
      <div className="mre-panel">
        <div className="mre-header">
          <span className="mre-label">HOW IT WORKS</span>
        </div>

        <div className="mre-flow">
          {/* Node 0: Use Case */}
          <motion.div
            className={`mre-node${lit(0) ? ' mre-node--lit' : ''}`}
            animate={lit(0) ? { borderColor: '#FFE600' } : { borderColor: 'rgba(255,230,0,0.18)' }}
            transition={{ duration: 0.3 }}
          >
            <span className="mre-node-label">YOUR USE CASE</span>
            <span className="mre-node-value">Coding Assistant</span>
          </motion.div>

          <MreArrow lit={lit(0)} />

          {/* Node 1: Weights */}
          <motion.div
            className={`mre-node${lit(1) ? ' mre-node--lit' : ''}`}
            animate={lit(1) ? { borderColor: '#FFE600' } : { borderColor: 'rgba(255,230,0,0.18)' }}
            transition={{ duration: 0.3 }}
          >
            <span className="mre-node-label">WEIGHTS APPLIED</span>
            <div className="mre-weight-bars">
              {WEIGHT_BARS.map((wb, idx) => (
                <div className="mre-weight-row" key={wb.label}>
                  <span className="mre-weight-label">{wb.label}</span>
                  <div className="mre-weight-track">
                    <motion.div
                      className="mre-weight-fill"
                      style={{ background: wb.color }}
                      initial={{ width: 0 }}
                      animate={lit(1) ? { width: `${wb.pct}%` } : { width: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                  <span className="mre-weight-pct">{wb.pct}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          <MreArrow lit={lit(1)} />

          {/* Node 2: VRAM Check */}
          <motion.div
            className={`mre-node${lit(2) ? ' mre-node--lit' : ''}`}
            animate={lit(2) ? { borderColor: '#FFE600' } : { borderColor: 'rgba(255,230,0,0.18)' }}
            transition={{ duration: 0.3 }}
          >
            <span className="mre-node-label">VRAM CHECK</span>
            <div className="mre-vram-row">
              <span className="mre-vram-text">12GB available</span>
              <span className="mre-vram-sep">/</span>
              <span className="mre-vram-text">8GB required</span>
              <motion.span
                className="mre-vram-check"
                initial={{ opacity: 0, scale: 0 }}
                animate={lit(2) ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ duration: 0.25, delay: 0.15 }}
              >
                ✓
              </motion.span>
            </div>
          </motion.div>

          <MreArrow lit={lit(2)} />

          {/* Node 3: Score */}
          <motion.div
            className={`mre-node${lit(3) ? ' mre-node--lit' : ''}`}
            animate={lit(3) ? { borderColor: '#FFE600' } : { borderColor: 'rgba(255,230,0,0.18)' }}
            transition={{ duration: 0.3 }}
          >
            <span className="mre-node-label">SCORE CALCULATED</span>
            <div className="mre-score-row">
              <AnimatedScore active={lit(3)} />
              <span className="mre-score-max">/ 1.00</span>
            </div>
          </motion.div>

          <MreArrow lit={lit(3)} />

          {/* Node 4: Ranked */}
          <motion.div
            className={`mre-node${lit(4) ? ' mre-node--lit' : ''}`}
            animate={lit(4) ? { borderColor: '#FFE600' } : { borderColor: 'rgba(255,230,0,0.18)' }}
            transition={{ duration: 0.3 }}
          >
            <span className="mre-node-label">MODELS RANKED</span>
            <div className="mre-ranked-list">
              {RANKED_MODELS.map((m, idx) => (
                <motion.div
                  key={m.rank}
                  className="mre-ranked-row"
                  initial={{ opacity: 0, x: -12 }}
                  animate={lit(4) ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, delay: idx * 0.1 }}
                >
                  <span className="mre-rank-badge">#{m.rank}</span>
                  <span className="mre-rank-name">{m.name}</span>
                  <span className="mre-rank-score">{m.score}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  )
}

function MreArrow({ lit }: { lit: boolean }) {
  return (
    <div className="mre-arrow-wrap">
      <svg width="2" height="28" viewBox="0 0 2 28" className="mre-arrow-svg">
        <motion.line
          x1="1" y1="0" x2="1" y2="22"
          stroke="rgba(255,230,0,0.4)"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={lit ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        />
        <motion.polygon
          points="1,28 -3,20 5,20"
          fill="rgba(255,230,0,0.5)"
          initial={{ opacity: 0 }}
          animate={lit ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        />
      </svg>
    </div>
  )
}
