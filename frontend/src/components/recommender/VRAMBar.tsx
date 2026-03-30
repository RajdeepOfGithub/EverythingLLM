import { motion } from 'framer-motion'

interface VRAMBarProps {
  used: number
  total: number | null
}

export default function VRAMBar({ used, total }: VRAMBarProps) {
  const BLOCKS = 10
  const ratio = total ? Math.min(used / total, 1.2) : null
  const filledCount = ratio === null ? 5 : Math.round(ratio * BLOCKS)
  const overflowing = ratio !== null && ratio > 1

  function blockColor(i: number): string {
    if (ratio === null) return 'rgba(255,255,255,0.15)'
    if (overflowing) return 'var(--red)'
    const pct = (i + 1) / BLOCKS
    if (pct <= ratio) {
      if (ratio < 0.7) return 'var(--green)'
      if (ratio < 0.9) return 'var(--orange)'
      return 'var(--red)'
    }
    return 'rgba(255,255,255,0.08)'
  }

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: BLOCKS }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: i < filledCount || ratio === null ? 1 : 0.3 }}
          transition={{ delay: i * 0.04, duration: 0.2, ease: 'easeOut' }}
          style={{
            width: 6,
            height: 20,
            borderRadius: 2,
            background: blockColor(i),
            transformOrigin: 'bottom',
          }}
        />
      ))}
      {total !== null && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--muted)',
            marginLeft: 6,
          }}
        >
          {used}GB / {total}GB
        </span>
      )}
    </div>
  )
}
