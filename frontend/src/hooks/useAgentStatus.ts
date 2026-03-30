import { useState, useEffect } from 'react'
import { checkAgentReachable } from '../utils/agentClient'

export function useAgentStatus() {
  const [agentReachable, setAgentReachable] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const reachable = await checkAgentReachable()
      if (!cancelled) {
        setAgentReachable(reachable)
        setLoading(false)
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { agentReachable, loading }
}
