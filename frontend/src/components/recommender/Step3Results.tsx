import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { useRecommenderStore } from '../../store/recommenderStore'
import { post } from '../../utils/apiClient'
import { SaveModelStackResponse } from '../../../../shared/contracts/backend_api'
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
  const { results, hardware, useCase, sliders, setStep } = useRecommenderStore()
  const best = results.find(r => r.is_best_pick)
  const rest = results.filter(r => !r.is_best_pick)
  const { displayed } = useTypewriter('Your recommended models', { speed: 28 })
  const vramTotal = hardware?.gpu.vram_total_gb ?? null
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSaveStack() {
    if (!useCase || !best) return
    setSaving(true)
    setSaveError(null)
    const totalVram = results.reduce((sum, r) => sum + r.vram_required_gb, 0)
    const simultaneousFit = vramTotal !== null && totalVram <= vramTotal
    try {
      const resp = await post<SaveModelStackResponse>('/models/save', {
        stack: results.map(r => ({
          use_case: useCase,
          hf_model_id: r.hf_model_id,
          model_name: r.model_name,
          sliders,
          vram_required_gb: r.vram_required_gb,
          can_run_simultaneously: simultaneousFit,
        })),
        total_vram_required_gb: totalVram,
        simultaneous_fit: simultaneousFit,
      })
      setSavedId(resp.stack_id)
    } catch {
      setSaveError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

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
                  <span className="metric-label">VRAM</span>
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
        {savedId ? (
          <span className="save-success">&#10003; Saved</span>
        ) : (
          <motion.button
            className="cta-button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveStack}
            disabled={saving || !best}
          >
            {saving ? 'Saving...' : 'Save Stack →'}
          </motion.button>
        )}
        {saveError && <span className="save-error">{saveError}</span>}
      </div>
    </div>
  )
}
