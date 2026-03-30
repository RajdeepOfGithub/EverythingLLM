import React from 'react'
import { motion } from 'framer-motion'
import { useRecommenderStore } from '../../store/recommenderStore'
import { scoreModels } from '../../utils/scoreModels'
import './recommender.css'

type SliderKey = 'quality' | 'speed' | 'fit' | 'context'

interface SliderConfig {
  key: SliderKey
  label: string
  desc: string
  color: string
}

const SLIDERS: SliderConfig[] = [
  { key: 'quality', label: 'Quality', desc: 'Output accuracy & benchmark score', color: 'var(--violet)' },
  { key: 'speed', label: 'Speed', desc: 'Tokens per second on your hardware', color: 'var(--blue)' },
  { key: 'fit', label: 'VRAM Fit', desc: 'How well the model fits in your GPU', color: 'var(--green)' },
  { key: 'context', label: 'Context', desc: 'Maximum context window length', color: 'var(--orange)' },
]

const EASE_CUBIC: [number, number, number, number] = [0.4, 0, 0.2, 1]

interface SliderRowProps {
  sliderKey: SliderKey
  label: string
  desc: string
  color: string
}

function SliderRow({ sliderKey, label, desc, color }: SliderRowProps) {
  const { sliders, setSlider } = useRecommenderStore()
  const value = sliders[sliderKey]
  const pct = `${((value - 1) / 4) * 100}%`

  return (
    <div className="slider-row">
      <div className="slider-meta">
        <span className="slider-label">{label}</span>
        <span className="slider-desc">{desc}</span>
      </div>
      <div className="slider-control">
        <div className="slider-track-wrap">
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={value}
            className="forge-slider"
            style={
              {
                '--slider-color': color,
                '--slider-pct': pct,
              } as React.CSSProperties
            }
            onChange={e => setSlider(sliderKey, Number(e.target.value))}
          />
          <div className="slider-ticks">
            <span>Low</span>
            <span>Balanced</span>
            <span>Max</span>
          </div>
        </div>
        <span className="slider-value">{value} / 5</span>
      </div>
    </div>
  )
}

export default function Step2Sliders() {
  const { sliders, hardware, setResults, setStep } = useRecommenderStore()

  function handleFind() {
    const results = scoreModels(sliders, hardware)
    setResults(results)
    setStep(3, 1)
  }

  return (
    <div className="step-container">
      <div className="step-hero">
        <h1 className="step-headline">Set your priorities</h1>
        <p className="step-subtitle">
          Drag each slider to balance what matters most. We'll weight the scoring accordingly.
        </p>
      </div>

      <motion.div
        className="sliders-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_CUBIC }}
      >
        {SLIDERS.map(s => (
          <SliderRow
            key={s.key}
            sliderKey={s.key}
            label={s.label}
            desc={s.desc}
            color={s.color}
          />
        ))}
      </motion.div>

      <div className="step-actions">
        <button className="back-button" onClick={() => setStep(1, -1)}>
          ← Back
        </button>
        <motion.button
          className="cta-button"
          onClick={handleFind}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Find My Models →
        </motion.button>
      </div>
    </div>
  )
}
