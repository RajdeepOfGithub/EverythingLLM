import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRecommenderStore } from '../../store/recommenderStore'
import { useTypewriter } from '../../hooks/useTypewriter'
import { useCountUp } from '../../hooks/useCountUp'
import VRAMBar from './VRAMBar'
import './recommender.css'

function AnimatedScore({ value, delay = 0 }: { value: number; delay?: number }) {
  const count = useCountUp(value, 900, delay)
  return <>{count}</>
}

function AnimatedTPS({ value, delay = 0 }: { value: number; delay?: number }) {
  const count = useCountUp(value, 900, delay)
  return <>{count}</>
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const EASE_CUBIC: [number, number, number, number] = [0.4, 0, 0.2, 1]

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_CUBIC },
  },
}

export default function Step3Results() {
  const { results, hardware, setStep, setSelectedModel } = useRecommenderStore()
  const navigate = useNavigate()
  const { displayed } = useTypewriter('Your recommended models', { speed: 28 })
  const vramTotal = hardware?.gpu.vram_total_gb ?? null
  const [fitsFilter, setFitsFilter] = useState(true)

  const allBest = results.find(r => r.is_best_pick)
  const allRest = results.filter(r => !r.is_best_pick)

  // When hardware is known and fitsFilter is ON, filter by VRAM fit
  const shouldFilter = fitsFilter && hardware !== null && vramTotal !== null
  const best = shouldFilter && allBest && allBest.vram_required_gb > vramTotal
    ? undefined
    : allBest
  const rest = shouldFilter
    ? allRest.filter(m => m.vram_required_gb <= vramTotal!)
    : allRest

  // Persist best pick so Hardware Planner + Benchmarker can pre-populate
  useEffect(() => {
    if (allBest) setSelectedModel(allBest)
  }, [allBest]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="step-container">
      <div className="step-hero">
        <h1 className="step-headline">{displayed}<span className="tw-cursor">_</span></h1>
        <p className="step-subtitle">
          Ranked by your priorities.{' '}
          {vramTotal
            ? `Based on ${vramTotal}GB VRAM detected.`
            : 'Connect the local agent for hardware-aware scoring.'}
        </p>
      </div>

      {hardware !== null && (
        <div className="vram-filter-row">
          <span className={`vram-filter-label${fitsFilter ? ' vram-filter-label--active' : ''}`}>
            FITS MY GPU
          </span>
          <button
            className={`vram-filter-toggle${fitsFilter ? ' vram-filter-toggle--on' : ''}`}
            onClick={() => setFitsFilter(v => !v)}
            aria-pressed={fitsFilter}
            aria-label="Toggle FITS MY GPU filter"
          >
            <span className="vram-filter-thumb" />
          </button>
        </div>
      )}

      <motion.div
        className="results-list"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {best && (
          <motion.div className="result-card best-pick" variants={cardVariants} animate={{ scale: [0.98, 1.01, 1.0] }} transition={{ duration: 0.4, ease: 'easeOut' }}>
            <div className="best-pick-header">
              <span className="best-pick-badge">&#9632; Best Pick</span>
            </div>
            <div className="result-card-inner">
              <div className="result-info">
                <span className="result-name">{best.model_name}</span>
                <span className="result-hf-id">{best.hf_model_id}</span>
                <div className="result-tags">
                  <span className="tag">{best.params}</span>
                  <span className="tag">{best.quant}</span>
                </div>
              </div>
              <div className="result-metrics">
                <div className="metric">
                  <span className="metric-label">Score</span>
                  <span className="metric-value score"><AnimatedScore value={best.score} delay={200} /></span>
                </div>
                <div className="metric">
                  <span className="metric-label">Est. TPS</span>
                  <span className="metric-value tps"><Zap size={11} /> <AnimatedTPS value={best.tps_estimate} delay={300} /></span>
                </div>
                <div className="metric">
                  <span className="metric-label">
                    VRAM <span className="metric-label-sub">base weight</span>
                  </span>
                  <VRAMBar used={best.vram_required_gb} total={vramTotal} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {rest.map((model, idx) => (
          <motion.div key={model.hf_model_id} className="result-card" variants={cardVariants}>
            <div className="result-card-inner">
              <div className="result-info">
                <span className="result-name">{model.model_name}</span>
                <span className="result-hf-id">{model.hf_model_id}</span>
                <div className="result-tags">
                  <span className="tag">{model.params}</span>
                  <span className="tag">{model.quant}</span>
                </div>
              </div>
              <div className="result-metrics">
                <div className="metric">
                  <span className="metric-label">Score</span>
                  <span className="metric-value score"><AnimatedScore value={model.score} delay={200 + idx * 80} /></span>
                </div>
                <div className="metric">
                  <span className="metric-label">Est. TPS</span>
                  <span className="metric-value tps">
                    <Zap size={12} /> <AnimatedTPS value={model.tps_estimate} delay={300 + idx * 80} />
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">
                    VRAM <span className="metric-label-sub">base weight</span>
                  </span>
                  <VRAMBar used={model.vram_required_gb} total={vramTotal} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="step-actions">
        <button className="back-button" onClick={() => setStep(2, -1)}>
          ← Back
        </button>
        <div className="step-actions-right">
          <motion.button
            className="cta-button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/hardware')}
            disabled={!allBest}
          >
            Next: Hardware Planner →
          </motion.button>
        </div>
      </div>
    </div>
  )
}
