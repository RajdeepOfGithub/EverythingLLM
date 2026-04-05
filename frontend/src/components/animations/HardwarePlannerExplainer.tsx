import { useEffect, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import './HardwarePlannerExplainer.css'

// Memory layers: each has a label, % of total bar, color, and GB value
const BASE_LAYERS = [
  { id: 'weights', label: 'MODEL WEIGHTS', pct: 55, gb: 4.2, color: 'var(--violet)' },
  { id: 'kvcache', label: 'KV CACHE', pct: 25, gb: 1.9, color: 'var(--blue)' },
  { id: 'runtime', label: 'RUNTIME OVERHEAD', pct: 10, gb: 0.8, color: 'var(--orange)' },
]
const TOTAL_GB = 6.9
const CAPACITY_GB = 12
const OVERFLOW_THRESHOLD = 8


function useCountUp(target: number, active: boolean, duration = 600): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) { setVal(0); return }
    const steps = 30
    const inc = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += inc
      if (current >= target) { setVal(target); clearInterval(timer) }
      else setVal(parseFloat(current.toFixed(1)))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [active, target, duration])
  return val
}

export default function HardwarePlannerExplainer() {
  const [layerActive, setLayerActive] = useState([false, false, false])
  const [showTotal, setShowTotal] = useState(false)
  const [showBadge, setShowBadge] = useState<'fit' | 'exceed' | null>(null)
  const [showOverflow, setShowOverflow] = useState(false)
  const [loopCount, setLoopCount] = useState(0)
  const [fitVariant, setFitVariant] = useState<'fit' | 'exceed'>('fit')

  useEffect(() => {
    let cancelled = false
    const tos: ReturnType<typeof setTimeout>[] = []

    const run = () => {
      setLayerActive([false, false, false])
      setShowTotal(false)
      setShowBadge(null)
      setShowOverflow(false)

      tos.push(setTimeout(() => { if (!cancelled) setLayerActive([true, false, false]) }, 200))
      tos.push(setTimeout(() => { if (!cancelled) setLayerActive([true, true, false]) }, 620))
      tos.push(setTimeout(() => { if (!cancelled) setLayerActive([true, true, true]) }, 1040))
      tos.push(setTimeout(() => { if (!cancelled) setShowTotal(true) }, 1500))
      tos.push(setTimeout(() => {
        if (!cancelled) {
          const variant = loopCount % 2 === 0 ? 'fit' : 'exceed'
          setFitVariant(variant)
          setShowBadge(variant)
        }
      }, 2100))
      tos.push(setTimeout(() => {
        if (!cancelled) setShowOverflow(true)
      }, 3300))
      tos.push(setTimeout(() => {
        if (!cancelled) setLoopCount(c => c + 1)
      }, 5000))
    }

    run()
    return () => { cancelled = true; tos.forEach(clearTimeout) }
  }, [loopCount])

  const totalGbDisplay = useCountUp(TOTAL_GB, showTotal, 500)
  const overflowGb = TOTAL_GB + 1.9 // KV cache doubled

  return (
    <MotionConfig reducedMotion="user">
      <div className="hpe-panel">
        <div className="hpe-header">
          <span className="hpe-header-label">VRAM MEMORY STACK</span>
          <span className="hpe-capacity-label">12GB GPU</span>
        </div>

        <div className="hpe-bars">
          {BASE_LAYERS.map((layer, i) => {
            const isKvOverflow = showOverflow && layer.id === 'kvcache'
            const overflowPct = isKvOverflow ? 50 : layer.pct
            const overflowGbVal = isKvOverflow ? layer.gb * 2 : layer.gb

            return (
              <div className="hpe-layer" key={layer.id}>
                <div className="hpe-layer-meta">
                  <span className="hpe-layer-name">{layer.label}</span>
                  <GbCounter
                    target={isKvOverflow ? overflowGbVal : layer.gb}
                    active={layerActive[i]}
                    color={layer.color}
                  />
                </div>
                <div className="hpe-track">
                  <motion.div
                    className="hpe-bar-fill"
                    style={{ background: layer.color }}
                    initial={{ width: 0 }}
                    animate={layerActive[i] ? { width: `${overflowPct}%` } : { width: 0 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  />
                  {isKvOverflow && (
                    <motion.div
                      className="hpe-overflow-extension"
                      initial={{ width: 0 }}
                      animate={{ width: `${overflowPct - layer.pct}%` }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    />
                  )}
                </div>
              </div>
            )
          })}

          {/* Total bar */}
          <div className="hpe-separator" />
          <div className="hpe-layer hpe-layer--total">
            <div className="hpe-layer-meta">
              <span className="hpe-layer-name hpe-layer-name--total">TOTAL</span>
              <span className="hpe-gb hpe-gb--total" style={{ color: showOverflow ? 'var(--red)' : 'var(--text)' }}>
                {showOverflow ? overflowGb.toFixed(1) : totalGbDisplay.toFixed(1)} GB
              </span>
            </div>
            <div className="hpe-track">
              <motion.div
                className="hpe-bar-fill hpe-bar-fill--total"
                style={{
                  background: showOverflow
                    ? 'var(--red)'
                    : fitVariant === 'exceed'
                    ? 'var(--orange)'
                    : 'var(--green)',
                }}
                initial={{ width: 0 }}
                animate={showTotal ? { width: `${showOverflow ? (overflowGb / CAPACITY_GB) * 100 : (TOTAL_GB / CAPACITY_GB) * 100}%` } : { width: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              />
              {/* overflow line */}
              <div
                className="hpe-overflow-line"
                style={{ left: `${(OVERFLOW_THRESHOLD / CAPACITY_GB) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="hpe-badge-area">
          {showBadge === 'fit' && !showOverflow && (
            <motion.div
              className="hpe-badge hpe-badge--fit"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              ✓ FITS IN 12GB
            </motion.div>
          )}
          {showBadge === 'exceed' && !showOverflow && (
            <motion.div
              className="hpe-badge hpe-badge--exceed"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              ✗ EXCEEDS 8GB
            </motion.div>
          )}
          {showOverflow && (
            <motion.div
              className="hpe-badge hpe-badge--overflow"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              ⚠ +KV CACHE DOUBLING → OVERFLOW
            </motion.div>
          )}
        </div>

        <div className="hpe-footer-note">
          Longer context = larger KV cache = more VRAM
        </div>
      </div>
    </MotionConfig>
  )
}

function GbCounter({ target, active, color }: { target: number; active: boolean; color: string }) {
  const val = useCountUp(target, active, 400)
  return (
    <span className="hpe-gb" style={{ color }}>
      {val.toFixed(1)} GB
    </span>
  )
}
