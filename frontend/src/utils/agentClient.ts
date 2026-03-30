export const AGENT_BASE_URL = 'http://localhost:7878/api/v1'

export async function checkAgentReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${AGENT_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

export function createMetricsSocket(sessionId: string): WebSocket {
  return new WebSocket(`ws://localhost:7878/ws/metrics/${sessionId}`)
}
