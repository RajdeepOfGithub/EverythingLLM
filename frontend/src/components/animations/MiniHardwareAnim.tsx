import { useEffect, useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import './MiniAnims.css'

const TOTAL_BLOCKS = 8
const FILL_STEPS = [
  { count: 3, label: '7B', color: 'var(--green)' },
  { count: 5, label: '13B', color: 'var(--orange)' },
  { count: 8, label: '70B', color: 'var(--red)' },
  { count: 10, label: '70B', color: 'var(--red)' }, // overflow
]

export default function MiniHardwareAnim() {
  const [stepIdx, setStepIdx] = useState(0)
  const [showOverflow, setShowOverflow] = useState(false)
  const [loopCount, setLoopCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const tos: ReturnType<typeof setTimeout>[] = []

    setStepIdx(0)
    setShowOverflow(false)

    tos.push(setTimeout(() => { if (!cancelled) setStepIdx(1) }, 600))
    tos.push(setTimeout(() => { if (!cancelled) setStepIdx(2) }, 1300))
    tos.push(setTimeout(() => { if (!cancelled) setStepIdx(3) }, 2100))
    tos.push(setTimeout(() => { if (!cancelled) setShowOverflow(true) }, 2400))
    tos.push(setTimeout(() => { if (!cancelled) setLoopCount(c => c + 1) }, 4000))

    return () => { cancelled = true; tos.forEach(clearTimeout) }
  }, [loopCount])

  const step = FILL_STEPS[stepIdx] || FILL_STEPS[0]
  const filledBlocks = Math.min(step.count, TOTAL_BLOCKS)
  const isOverflow = step.count > TOTAL_BLOCKS

  return (
    <MotionConfig reducedMotion="user">
      <div className="mini-anim">
        {/* Label */}
        <div className="mini-hw-label">
          <span className="mini-hw-key">Model Size:</span>
          <motion.span
            key={step.label + stepIdx}
            className="mini-hw-val"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: step.color }}
          >
            {step.label}
          </motion.span>
        </div>

        {/* VRAM bar — segmented blocks */}
        <div className="mini-vram-bar">
          {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => (
            <motion.div
              key={i}
              className="mini-vram-block"
              animate={{
                background: i < filledBlocks ? step.color : 'rgba(255,230,0,0.05)',
                opacity: 1,
              }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            />
          ))}
        </div>

        {/* Overflow indicator */}
        <AnimatePresence>
          {showOverflow && isOverflow && (
            <motion.div
              className="mini-overflow-flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: [1, 0.3, 1, 0.3, 1, 0] }}
              transition={{ duration: 1.2, times: [0, 0.15, 0.3, 0.5, 0.7, 1] }}
            >
              ⚠ VRAM OVERFLOW
            </motion.div>
          )}
        </AnimatePresence>

        {/* VRAM label */}
        <div className="mini-vram-meta">
          <span className="mini-vram-used">{filledBlocks * 1.5}GB used</span>
          <span className="mini-vram-total">/ 12GB</span>
        </div>
      </div>
    </MotionConfig>
  )
}
