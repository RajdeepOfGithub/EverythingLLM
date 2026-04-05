import { useEffect, useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import './MiniAnims.css'

const TOKENS = ['T1', 'T2', 'T3', 'T4', 'T5']
const VERDICTS = [true, true, true, false, true]

interface Bubble {
  id: number
  token: string
  verdict: boolean | null
  replaced: boolean
}

export default function MiniSpeculativeAnim() {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [loopCount, setLoopCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const tos: ReturnType<typeof setTimeout>[] = []

    setBubbles([])

    // Emit tokens staggered
    TOKENS.forEach((tok, i) => {
      tos.push(setTimeout(() => {
        if (!cancelled) {
          setBubbles(prev => [
            ...prev,
            { id: i, token: tok, verdict: null, replaced: false },
          ])
        }
      }, 300 + i * 80))
    })

    // Stamp verdicts
    TOKENS.forEach((_, i) => {
      tos.push(setTimeout(() => {
        if (!cancelled) {
          setBubbles(prev => prev.map(b =>
            b.id === i ? { ...b, verdict: VERDICTS[i] } : b
          ))
        }
      }, 900 + i * 160))
    })

    // Replace rejected
    const rejIdx = VERDICTS.indexOf(false)
    tos.push(setTimeout(() => {
      if (!cancelled) {
        setBubbles(prev => prev.map(b =>
          b.id === rejIdx ? { ...b, token: 'R*', replaced: true, verdict: true } : b
        ))
      }
    }, 1700))

    // Loop
    tos.push(setTimeout(() => {
      if (!cancelled) setLoopCount(c => c + 1)
    }, 3600))

    return () => { cancelled = true; tos.forEach(clearTimeout) }
  }, [loopCount])

  return (
    <MotionConfig reducedMotion="user">
      <div className="mini-anim">
        {/* Two boxes */}
        <div className="mini-spec-boxes">
          <div className="mini-spec-box mini-spec-box--draft">
            <span className="mini-spec-box-label">DRAFT</span>
            <span className="mini-spec-box-sub">1.3B</span>
          </div>
          <div className="mini-spec-box mini-spec-box--main">
            <span className="mini-spec-box-label">MAIN</span>
            <span className="mini-spec-box-sub">70B</span>
          </div>
        </div>

        {/* Bubbles */}
        <div className="mini-spec-bubbles">
          {bubbles.map(b => {
            const color =
              b.verdict === null ? 'var(--text-dim)'
              : b.replaced ? 'var(--blue)'
              : b.verdict ? 'var(--green)'
              : 'var(--red)'

            return (
              <motion.div
                key={b.id}
                className="mini-spec-bubble"
                style={{ borderColor: color, color }}
                initial={{ opacity: 0, scale: 0.5, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {b.verdict === null ? b.token
                  : b.verdict && !b.replaced ? `✓${b.token}`
                  : !b.verdict ? `✗${b.token}`
                  : `✓${b.token}`}
              </motion.div>
            )
          })}
        </div>

        {/* Speed indicator */}
        <AnimatePresence>
          {bubbles.length === TOKENS.length && (
            <motion.div
              className="mini-spec-speed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              ~2.8× faster
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
