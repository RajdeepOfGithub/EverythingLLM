import { useState, useEffect } from 'react'

export function useCountUp(target: number, duration = 900, delay = 0) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    setValue(0)
    let startTime: number | null = null
    let rafId: number

    const timeoutId = setTimeout(() => {
      function tick(timestamp: number) {
        if (!startTime) startTime = timestamp
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / duration, 1)
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) {
          rafId = requestAnimationFrame(tick)
        } else {
          setValue(target)
        }
      }
      rafId = requestAnimationFrame(tick)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
      cancelAnimationFrame(rafId)
    }
  }, [target, duration, delay])

  return value
}
