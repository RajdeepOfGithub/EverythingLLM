import { useEffect, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import './MiniAnims.css'

const SLIDERS = [
  { label: 'Quality', targets: [0.8, 0.4, 0.9, 0.6], color: 'var(--violet)' },
  { label: 'Speed', targets: [0.3, 0.7, 0.5, 0.85], color: 'var(--blue)' },
  { label: 'Fit', targets: [0.6, 0.9, 0.35, 0.7], color: 'var(--green)' },
]

const PHASE_DURATION = 1400

const RANKINGS = [
  [
    { name: 'Llama-3-8B', score: 87 },
    { name: 'Mistral-7B', score: 74 },
    { name: 'Phi-3-mini', score: 61 },
  ],
  [
    { name: 'Mistral-7B', score: 81 },
    { name: 'Phi-3-mini', score: 76 },
    { name: 'Llama-3-8B', score: 55 },
  ],
  [
    { name: 'Phi-3-mini', score: 92 },
    { name: 'Llama-3-8B', score: 78 },
    { name: 'Mistral-7B', score: 63 },
  ],
]

export default function MiniRecommenderAnim() {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [rankingIdx, setRankingIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseIdx(p => (p + 1) % SLIDERS[0].targets.length)
      setRankingIdx(r => (r + 1) % RANKINGS.length)
    }, PHASE_DURATION)
    return () => clearInterval(timer)
  }, [])

  const ranking = RANKINGS[rankingIdx]

  return (
    <MotionConfig reducedMotion="user">
      <div className="mini-anim">
        {/* Sliders */}
        <div className="mini-sliders">
          {SLIDERS.map(sl => (
            <div key={sl.label} className="mini-slider-row">
              <span className="mini-slider-label">{sl.label}</span>
              <div className="mini-slider-track">
                <motion.div
                  className="mini-slider-fill"
                  style={{ background: sl.color }}
                  animate={{ width: `${sl.targets[phaseIdx] * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                />
                <motion.div
                  className="mini-slider-thumb"
                  style={{ background: sl.color, boxShadow: `0 0 8px ${sl.color}` }}
                  animate={{ left: `calc(${sl.targets[phaseIdx] * 100}% - 5px)` }}
                  transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Rankings */}
        <div className="mini-rankings">
          {ranking.map((item, i) => (
            <motion.div
              key={item.name}
              className="mini-rank-row"
              layout
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="mini-rank-num" style={{ color: i === 0 ? 'var(--violet)' : 'var(--muted)' }}>
                #{String(i + 1).padStart(2, '0')}
              </span>
              <span className="mini-rank-name">{item.name}</span>
              <motion.span
                className="mini-rank-score"
                style={{ color: i === 0 ? 'var(--violet)' : 'var(--text-dim)' }}
                animate={{ opacity: [0.4, 1] }}
                transition={{ duration: 0.4 }}
              >
                {item.score}
              </motion.span>
            </motion.div>
          ))}
        </div>
      </div>
    </MotionConfig>
  )
}
