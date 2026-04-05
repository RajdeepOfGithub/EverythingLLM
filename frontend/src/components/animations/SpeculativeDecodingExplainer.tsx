import { useEffect, useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import './SpeculativeDecodingExplainer.css'

const TOKENS = ['The', 'quick', 'brown', 'fox', 'jumped']
// true = accepted, false = rejected
const VERDICTS = [true, true, true, false, true]
const REPLACEMENT = 'lazy'

type TokenState = 'hidden' | 'emitting' | 'traveling' | 'accepted' | 'rejected' | 'replaced'

interface TokenEntry {
  word: string
  state: TokenState
}

type Phase = 'idle' | 'input_lit' | 'draft_emit' | 'verifying' | 'output' | 'speed_badge' | 'vram_compare' | 'done'

export default function SpeculativeDecodingExplainer() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [tokens, setTokens] = useState<TokenEntry[]>(
    TOKENS.map(w => ({ word: w, state: 'hidden' }))
  )
  const [outputTokens, setOutputTokens] = useState<string[]>([])
  const [showVram, setShowVram] = useState(false)
  const [loopCount, setLoopCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const tos: ReturnType<typeof setTimeout>[] = []

    // Reset
    setPhase('idle')
    setTokens(TOKENS.map(w => ({ word: w, state: 'hidden' })))
    setOutputTokens([])
    setShowVram(false)

    const go = (fn: () => void, ms: number) => {
      const t = setTimeout(() => { if (!cancelled) fn() }, ms)
      tos.push(t)
    }

    // Timeline
    go(() => setPhase('input_lit'), 400)
    go(() => setPhase('draft_emit'), 1000)

    // Stagger token emissions
    TOKENS.forEach((_, i) => {
      go(() => {
        setTokens(prev => prev.map((t, idx) =>
          idx === i ? { ...t, state: 'emitting' } : t
        ))
      }, 1200 + i * 100)
      go(() => {
        setTokens(prev => prev.map((t, idx) =>
          idx === i ? { ...t, state: 'traveling' } : t
        ))
      }, 1350 + i * 100)
    })

    // Verification phase
    go(() => setPhase('verifying'), 2000)
    TOKENS.forEach((_, i) => {
      go(() => {
        setTokens(prev => prev.map((t, idx) =>
          idx === i
            ? { ...t, state: VERDICTS[i] ? 'accepted' : 'rejected' }
            : t
        ))
      }, 2200 + i * 160)
    })

    // Rejection replacement
    const rejIdx = VERDICTS.indexOf(false)
    go(() => {
      setTokens(prev => prev.map((t, idx) =>
        idx === rejIdx ? { ...t, word: REPLACEMENT, state: 'replaced' } : t
      ))
    }, 2200 + TOKENS.length * 160 + 300)

    // Output phase
    go(() => {
      setPhase('output')
      const accepted = TOKENS.map((w, i) => (VERDICTS[i] ? w : REPLACEMENT))
      setOutputTokens(accepted)
    }, 3400)

    go(() => setPhase('speed_badge'), 4200)
    go(() => setShowVram(true), 5000)
    go(() => setLoopCount(c => c + 1), 9000)

    return () => { cancelled = true; tos.forEach(clearTimeout) }
  }, [loopCount])

  return (
    <MotionConfig reducedMotion="user">
      <div className="sde-panel">
        {/* Part A — Flow */}
        <div className="sde-section-label">HOW SPECULATIVE DECODING WORKS</div>

        <div className="sde-flow">
          {/* INPUT */}
          <FlowBox
            label="INPUT"
            sub="User prompt"
            lit={phase !== 'idle'}
            color="var(--violet)"
            size="sm"
          />

          <FlowArrow lit={phase !== 'idle'} />

          {/* DRAFT MODEL */}
          <FlowBox
            label="DRAFT"
            sub="Phi-2 1.3B"
            subsub="Fast, small"
            lit={['draft_emit', 'verifying', 'output', 'speed_badge', 'vram_compare', 'done'].includes(phase)}
            color="var(--blue)"
            size="md"
          />

          {/* Token bubbles */}
          <div className="sde-bubbles-track">
            {tokens.map((tok, i) => (
              <TokenBubble key={i} entry={tok} index={i} />
            ))}
          </div>

          <FlowArrow lit={['verifying', 'output', 'speed_badge', 'vram_compare', 'done'].includes(phase)} />

          {/* MAIN MODEL */}
          <FlowBox
            label="MAIN"
            sub="Llama3 70B"
            subsub="Slow, accurate"
            lit={['verifying', 'output', 'speed_badge', 'vram_compare', 'done'].includes(phase)}
            color="var(--orange)"
            size="lg"
          />

          <FlowArrow lit={['output', 'speed_badge', 'vram_compare', 'done'].includes(phase)} />

          {/* OUTPUT */}
          <FlowBox
            label="OUTPUT"
            sub=""
            lit={['output', 'speed_badge', 'vram_compare', 'done'].includes(phase)}
            color="var(--green)"
            size="sm"
            output={outputTokens}
          />
        </div>

        {/* Speed badge */}
        <AnimatePresence>
          {phase === 'speed_badge' || showVram ? (
            <motion.div
              className="sde-speed-badge"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              ~2.8× faster than standard autoregressive decoding
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Part B — VRAM comparison */}
        <AnimatePresence>
          {showVram && (
            <motion.div
              className="sde-vram-section"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="sde-section-label">VRAM COMPARISON</div>
              <div className="sde-vram-panels">
                <VramPanel
                  label="WITHOUT"
                  bars={[{ label: 'Llama3 70B', pct: 90, color: 'var(--orange)', gb: '43.2GB' }]}
                  total="48GB VRAM required"
                  status="High-end GPU only"
                  statusColor="var(--red)"
                  glow={false}
                />
                <VramPanel
                  label="WITH SPEC DECODING"
                  bars={[
                    { label: 'Llama3 70B', pct: 90, color: 'var(--orange)', gb: '43.2GB' },
                    { label: 'Phi-2 1.3B', pct: 3, color: 'var(--blue)', gb: '+1.5GB' },
                  ]}
                  total="48GB + 1.5GB"
                  status="2–3× speedup for +3% VRAM"
                  statusColor="var(--green)"
                  glow={true}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function FlowBox({
  label, sub, subsub, lit, color, size, output,
}: {
  label: string
  sub: string
  subsub?: string
  lit: boolean
  color: string
  size: 'sm' | 'md' | 'lg'
  output?: string[]
}) {
  return (
    <motion.div
      className={`sde-flow-box sde-flow-box--${size}`}
      animate={{
        borderColor: lit ? color : 'rgba(255,230,0,0.18)',
        boxShadow: lit
          ? `0 0 16px ${color}33`
          : 'none',
      }}
      transition={{ duration: 0.3 }}
    >
      <span className="sde-box-label" style={{ color: lit ? color : 'var(--muted)' }}>
        {label}
      </span>
      {sub && <span className="sde-box-sub">{sub}</span>}
      {subsub && <span className="sde-box-subsub">{subsub}</span>}
      {output && output.length > 0 && (
        <div className="sde-output-tokens">
          {output.map((w, i) => (
            <motion.span
              key={i}
              className="sde-out-token"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.15 }}
            >
              {w}
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function FlowArrow({ lit }: { lit: boolean }) {
  return (
    <motion.div
      className="sde-flow-arrow"
      animate={{ color: lit ? 'rgba(255,230,0,0.6)' : 'rgba(80,80,80,0.4)' }}
      transition={{ duration: 0.3 }}
    >
      →
    </motion.div>
  )
}

function TokenBubble({ entry, index }: { entry: TokenEntry; index: number }) {
  const { word, state } = entry
  if (state === 'hidden') return null

  const color =
    state === 'accepted' ? 'var(--green)'
    : state === 'rejected' ? 'var(--red)'
    : state === 'replaced' ? 'var(--blue)'
    : 'var(--text-dim)'

  const bgAlpha =
    state === 'accepted' ? '0.12'
    : state === 'rejected' ? '0.12'
    : state === 'replaced' ? '0.12'
    : '0.04'

  return (
    <motion.div
      className="sde-token-bubble"
      style={{
        borderColor: color,
        color,
        background: `rgba(${state === 'accepted' ? '0,255,136' : state === 'rejected' ? '255,51,0' : state === 'replaced' ? '0,229,255' : '240,240,240'},${bgAlpha})`,
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: 1,
        scale: state === 'rejected' ? [1, 1.15, 0.85, 1] : 1,
        y: state === 'traveling' ? [-6, 0] : 0,
      }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      {state === 'rejected' ? '✗' : state === 'accepted' ? '✓' : ''} {word}
    </motion.div>
  )
}

function VramPanel({
  label, bars, total, status, statusColor, glow,
}: {
  label: string
  bars: { label: string; pct: number; color: string; gb: string }[]
  total: string
  status: string
  statusColor: string
  glow: boolean
}) {
  return (
    <div className={`sde-vram-panel${glow ? ' sde-vram-panel--glow' : ''}`}>
      <div className="sde-vram-label">{label}</div>
      <div className="sde-vram-bars">
        {bars.map((bar, i) => (
          <div key={i} className="sde-vram-bar-row">
            <span className="sde-vram-bar-name">{bar.label}</span>
            <div className="sde-vram-track">
              <motion.div
                className="sde-vram-fill"
                style={{ background: bar.color }}
                initial={{ width: 0 }}
                animate={{ width: `${bar.pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.2, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
            <span className="sde-vram-gb" style={{ color: bar.color }}>{bar.gb}</span>
          </div>
        ))}
      </div>
      <div className="sde-vram-total">{total}</div>
      <div className="sde-vram-status" style={{ color: statusColor }}>{status}</div>
    </div>
  )
}
