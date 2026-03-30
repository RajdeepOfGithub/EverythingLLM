import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { useRecommenderStore } from '../../store/recommenderStore'
import VRAMBar from './VRAMBar'
import './recommender.css'

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
  const { results, hardware, setStep } = useRecommenderStore()
  const best = results.find(r => r.is_best_pick)
  const rest = results.filter(r => !r.is_best_pick)
  const vramTotal = hardware?.gpu.vram_total_gb ?? null

  return (
    <div className="step-container">
      <div className="step-hero">
        <h1 className="step-headline">Your recommended models</h1>
        <p className="step-subtitle">
          Ranked by your priorities.{' '}
          {vramTotal
            ? `Based on ${vramTotal}GB VRAM detected.`
            : 'Connect the local agent for hardware-aware scoring.'}
        </p>
      </div>

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
                  <span className="metric-value score">{best.score}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Est. TPS</span>
                  <span className="metric-value tps"><Zap size={11} /> {best.tps_estimate}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">VRAM</span>
                  <VRAMBar used={best.vram_required_gb} total={vramTotal} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {rest.map(model => (
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
                  <span className="metric-value score">{model.score}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Est. TPS</span>
                  <span className="metric-value tps">
                    <Zap size={12} /> {model.tps_estimate}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">VRAM</span>
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
        <motion.button
          className="cta-button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Save Stack →
        </motion.button>
      </div>
    </div>
  )
}
