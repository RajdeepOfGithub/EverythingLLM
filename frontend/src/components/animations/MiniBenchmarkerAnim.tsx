import { useEffect, useRef, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import './MiniAnims.css'

const DOT_INTERVAL = 220
const TPS_MAX = 47
const LOOP_DURATION = 3200

function buildPath(w: number, h: number): string {
  const pts = [
    [0, h * 0.75],
    [w * 0.25, h * 0.55],
    [w * 0.5, h * 0.2],
    [w * 0.75, h * 0.35],
    [w, h * 0.15],
  ]
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
}

export default function MiniBenchmarkerAnim() {
  const [dots, setDots] = useState<{ id: number; x: number }[]>([])
  const [tps, setTps] = useState(0)
  const [chartProgress, setChartProgress] = useState(0)
  const [loopCount, setLoopCount] = useState(0)
  const idRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const tos: ReturnType<typeof setTimeout>[] = []

    setDots([])
    setTps(0)
    setChartProgress(0)

    // Stream dots at fixed intervals
    let dotTimer: ReturnType<typeof setInterval> | null = null
    dotTimer = setInterval(() => {
      if (cancelled) return
      const id = idRef.current++
      setDots(prev => [...prev.slice(-6), { id, x: 0 }])
    }, DOT_INTERVAL)

    // Tick TPS up
    let tpsFrame = 0
    const tpsTimer = setInterval(() => {
      if (cancelled) return
      tpsFrame++
      const t = Math.min(TPS_MAX, Math.floor((tpsFrame / (LOOP_DURATION / 40)) * TPS_MAX))
      setTps(t)
      if (tpsFrame >= LOOP_DURATION / 40) clearInterval(tpsTimer)
    }, 40)

    // Chart draws in
    tos.push(setTimeout(() => {
      if (!cancelled) setChartProgress(1)
    }, 800))

    // Reset loop
    tos.push(setTimeout(() => {
      if (!cancelled) {
        if (dotTimer) clearInterval(dotTimer)
        clearInterval(tpsTimer)
        setLoopCount(c => c + 1)
      }
    }, LOOP_DURATION))

    return () => {
      cancelled = true
      if (dotTimer) clearInterval(dotTimer)
      clearInterval(tpsTimer)
      tos.forEach(clearTimeout)
    }
  }, [loopCount])

  const W = 140
  const H = 50
  const pathD = buildPath(W, H)

  return (
    <MotionConfig reducedMotion="user">
      <div className="mini-anim">
        {/* TPS counter + dots track */}
        <div className="mini-bench-top">
          <div className="mini-dot-track">
            {dots.map(dot => (
              <motion.div
                key={dot.id}
                className="mini-dot"
                initial={{ x: 0, opacity: 1 }}
                animate={{ x: 120, opacity: 0 }}
                transition={{ duration: 0.9, ease: 'linear' }}
              />
            ))}
          </div>
          <div className="mini-tps-counter">
            <span className="mini-tps-val" style={{ color: 'var(--blue)' }}>{tps}</span>
            <span className="mini-tps-unit">TPS</span>
          </div>
        </div>

        {/* SVG chart */}
        <div className="mini-chart-wrap">
          <svg width={W} height={H} className="mini-chart-svg">
            <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,230,0,0.06)" strokeWidth="1" />
            <motion.path
              d={pathD}
              stroke="var(--blue)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: chartProgress, opacity: chartProgress > 0 ? 1 : 0 }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            />
          </svg>
          <div className="mini-chart-x">batch size →</div>
        </div>
      </div>
    </MotionConfig>
  )
}
