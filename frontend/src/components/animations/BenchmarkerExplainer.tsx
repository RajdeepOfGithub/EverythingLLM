import { useEffect, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import './BenchmarkerExplainer.css'

const BATCH_SIZES = [1, 4, 8, 16]
const THREADS = [2, 4, 8]

// TPS values per cell [thread_row][batch_col]
const TPS_DATA = [
  [12, 24, 31, 28],
  [18, 38, 47, 41],
  [14, 29, 36, 32],
]

const TOTAL_CELLS = BATCH_SIZES.length * THREADS.length // 12

function cellIndex(row: number, col: number) {
  return row * BATCH_SIZES.length + col
}

function tpsColor(tps: number): string {
  if (tps >= 40) return 'var(--green)'
  if (tps >= 25) return 'var(--blue)'
  if (tps >= 15) return 'var(--orange)'
  return 'var(--muted)'
}

function buildChartPoints(width: number, height: number) {
  // Use row 1 (threads=4) TPS values across batch sizes
  const vals = TPS_DATA[1]
  const maxVal = Math.max(...vals)
  return vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * width,
    y: height - (v / maxVal) * height,
  }))
}

export default function BenchmarkerExplainer() {
  const [activeCellIdx, setActiveCellIdx] = useState(-1)
  const [completedCells, setCompletedCells] = useState<number[]>([])
  const [bestPulse, setBestPulse] = useState(false)
  const [chartProgress, setChartProgress] = useState(0)
  const [loopCount, setLoopCount] = useState(0)

  // Best cell: row=1, col=2 (threads=4, batch=8) TPS=47
  const bestCell = cellIndex(1, 2)

  useEffect(() => {
    let cancelled = false
    const tos: ReturnType<typeof setTimeout>[] = []

    setActiveCellIdx(-1)
    setCompletedCells([])
    setBestPulse(false)
    setChartProgress(0)

    const CELL_DWELL = 220

    for (let i = 0; i < TOTAL_CELLS; i++) {
      tos.push(setTimeout(() => {
        if (!cancelled) setActiveCellIdx(i)
      }, i * CELL_DWELL))
      tos.push(setTimeout(() => {
        if (!cancelled) setCompletedCells(prev => [...prev, i])
      }, i * CELL_DWELL + CELL_DWELL - 30))
    }

    const sweepDone = TOTAL_CELLS * CELL_DWELL

    // Draw chart during last few cells
    tos.push(setTimeout(() => {
      if (!cancelled) setChartProgress(1)
    }, sweepDone - 400))

    // Best cell pulse after sweep
    tos.push(setTimeout(() => {
      if (!cancelled) {
        setActiveCellIdx(-1)
        setBestPulse(true)
      }
    }, sweepDone + 100))

    // Loop reset
    tos.push(setTimeout(() => {
      if (!cancelled) setLoopCount(c => c + 1)
    }, sweepDone + 2200))

    return () => { cancelled = true; tos.forEach(clearTimeout) }
  }, [loopCount])

  const chartW = 200
  const chartH = 60
  const pts = buildChartPoints(chartW, chartH)
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <MotionConfig reducedMotion="user">
      <div className="be-panel">
        <div className="be-header">
          <span className="be-header-label">PARAMETER SWEEP</span>
          <span className="be-subtext">BATCH × THREADS</span>
        </div>

        {/* Grid */}
        <div className="be-grid-wrap">
          {/* Column headers */}
          <div className="be-grid-row be-grid-row--header">
            <div className="be-corner-cell" />
            {BATCH_SIZES.map(b => (
              <div key={b} className="be-col-header">
                <span>B{b}</span>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {THREADS.map((t, row) => (
            <div key={t} className="be-grid-row">
              <div className="be-row-header">T{t}</div>
              {BATCH_SIZES.map((_, col) => {
                const idx = cellIndex(row, col)
                const tps = TPS_DATA[row][col]
                const isActive = activeCellIdx === idx
                const isDone = completedCells.includes(idx)
                const isBest = idx === bestCell

                return (
                  <motion.div
                    key={col}
                    className={`be-cell${isActive ? ' be-cell--active' : ''}${isBest && bestPulse ? ' be-cell--best' : ''}`}
                    animate={isBest && bestPulse ? {
                      boxShadow: [
                        '0 0 0 1px rgba(0,255,136,0.3)',
                        '0 0 16px rgba(0,255,136,0.6)',
                        '0 0 0 1px rgba(0,255,136,0.3)',
                      ]
                    } : {}}
                    transition={isBest && bestPulse ? { duration: 1, repeat: Infinity } : {}}
                  >
                    {isDone || (isBest && bestPulse) ? (
                      <motion.span
                        className="be-cell-tps"
                        style={{ color: tpsColor(tps) }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                      >
                        {tps}
                      </motion.span>
                    ) : null}
                    {isBest && bestPulse && (
                      <div className="be-best-badge">BEST</div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="be-chart-wrap">
          <div className="be-chart-label-y">tokens/sec</div>
          <div className="be-chart-inner">
            <svg width={chartW} height={chartH} className="be-chart-svg">
              {/* Grid lines */}
              <line x1="0" y1={chartH / 2} x2={chartW} y2={chartH / 2} stroke="rgba(255,230,0,0.06)" strokeWidth="1" />
              <line x1="0" y1="0" x2={chartW} y2="0" stroke="rgba(255,230,0,0.06)" strokeWidth="1" />
              {/* Animated line */}
              <motion.path
                d={pathD}
                stroke="var(--green)"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: chartProgress, opacity: chartProgress > 0 ? 1 : 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
              {/* Dots */}
              {pts.map((p, i) => (
                <motion.circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill="var(--green)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={chartProgress >= (i / (pts.length - 1))
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0 }
                  }
                  transition={{ duration: 0.2, delay: i * 0.15 }}
                />
              ))}
            </svg>
            <div className="be-chart-label-x">batch size →</div>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}
