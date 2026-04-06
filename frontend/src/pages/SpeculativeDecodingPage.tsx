import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import SpeculativeDecodingExplainer from '../components/animations/SpeculativeDecodingExplainer'
import { useCountUp } from '../hooks/useCountUp'
import { AGENT_BASE_URL, createMetricsSocket } from '../utils/agentClient'
import { get } from '../utils/apiClient'
import type {
  BenchmarkStatus,
  BenchmarkStartResponse,
  AgentWebSocketEvent,
  HardwareResponse,
} from '../types/contracts'
import type { DraftModelCandidate } from '../types/contracts'
import './SpeculativeDecodingPage.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelInfo {
  name: string
  path: string
  size_gb: number
}

interface SpecTick {
  proposed: number
  accepted: number
  acceptance_rate: number
  speedup: number
  t: number
}

interface MetricTick {
  eval_tps: number
  vram_mb: number
  cpu_pct: number
}

type PageStatus = 'idle' | BenchmarkStatus

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<PageStatus, string> = {
  idle: 'IDLE',
  loading_model: 'LOADING MODEL',
  warming_up: 'WARMING UP',
  generating: 'GENERATING',
  completed: 'COMPLETED',
  failed: 'FAILED',
}

const STATUS_COLORS: Record<PageStatus, string> = {
  idle: 'var(--muted)',
  loading_model: '#fb923c',
  warming_up: '#fb923c',
  generating: 'var(--blue)',
  completed: '#4ade80',
  failed: '#f87171',
}

// ---------------------------------------------------------------------------
// TokenStream component
// ---------------------------------------------------------------------------

function TokenStream({ specTicks }: { specTicks: SpecTick[] }) {
  const visible = specTicks.slice(-5)

  return (
    <div className="spec-token-stream">
      <div className="spec-token-stream-label">TOKEN STREAM</div>
      <AnimatePresence>
        {visible.map((tick, rowIdx) => {
          const chips = Array.from({ length: tick.proposed }, (_, i) => ({
            accepted: i < tick.accepted,
          }))
          return (
            <motion.div
              key={specTicks.length - visible.length + rowIdx}
              className="spec-token-row"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1 - rowIdx * 0.15, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {chips.map((chip, i) => (
                <motion.span
                  key={i}
                  className={`spec-token-chip ${chip.accepted ? 'accepted' : 'rejected'}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.15 }}
                />
              ))}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AcceptanceBar component
// ---------------------------------------------------------------------------

function AcceptanceBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100)
  const color =
    rate >= 0.7 ? '#4ade80' : rate >= 0.5 ? '#fb923c' : '#f87171'

  return (
    <div className="spec-acceptance-bar-wrapper">
      <div className="spec-acceptance-bar-label">TOKEN ACCEPTANCE RATE</div>
      <div className="spec-acceptance-bar-track">
        <motion.div
          className="spec-acceptance-bar-fill"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <span className="spec-acceptance-bar-pct" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DraftCandidateCard
// ---------------------------------------------------------------------------

function DraftCandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: DraftModelCandidate
  selected: boolean
  onSelect: () => void
}) {
  const hasRate = candidate.community_acceptance_rate !== null
  const rate = candidate.community_acceptance_rate ?? 0
  const ratePct = Math.round(rate * 100)
  const rateColor = rate >= 0.7 ? '#4ade80' : rate >= 0.5 ? '#fb923c' : '#f87171'

  return (
    <motion.div
      className={`spec-draft-card${selected ? ' spec-draft-card--selected' : ''}`}
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {selected && (
        <span className="spec-draft-checkmark">✓</span>
      )}

      <div className="spec-draft-name">{candidate.name}</div>

      <div className="spec-draft-speedup">
        {candidate.estimated_speedup.toFixed(1)}x SPEEDUP
      </div>

      {hasRate && (
        <div className="spec-draft-acceptance-bar">
          <div className="spec-draft-acceptance-track">
            <motion.div
              className="spec-draft-acceptance-fill"
              style={{ background: rateColor, width: `${ratePct}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${ratePct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="spec-draft-acceptance-pct" style={{ color: rateColor }}>
            {ratePct}%
          </span>
        </div>
      )}

      <div className="spec-draft-vram">
        {candidate.vram_required_gb.toFixed(1)} GB VRAM
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// SkeletonCard
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <motion.div
      className="spec-skeleton-card"
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

// ---------------------------------------------------------------------------
// ResultsCard
// ---------------------------------------------------------------------------

function SpecResultsCard({
  specTicks,
  latestMetric,
  draftName,
}: {
  specTicks: SpecTick[]
  latestMetric: MetricTick | null
  draftName: string
}) {
  const peakSpeedup = Math.max(...specTicks.map(t => t.speedup), 0)
  const avgAcceptance =
    specTicks.length > 0
      ? specTicks.reduce((sum, t) => sum + t.acceptance_rate, 0) / specTicks.length
      : 0
  const peakEvalTps = latestMetric?.eval_tps ?? 0

  const animSpeedup = useCountUp(Math.round(peakSpeedup * 10), 900, 0)
  const animAccept = useCountUp(Math.round(avgAcceptance * 100), 900, 100)
  const animTps = useCountUp(Math.round(peakEvalTps), 900, 200)

  return (
    <motion.div
      className="spec-results-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="spec-results-header">SPECULATIVE BENCHMARK RESULTS</div>

      <div className="spec-results-stats">
        <div className="spec-results-stat">
          <span className="spec-results-stat-value" style={{ color: '#fb923c' }}>
            {(animSpeedup / 10).toFixed(1)}x
          </span>
          <span className="spec-results-stat-name">PEAK SPEEDUP</span>
        </div>
        <div className="spec-results-stat">
          <span className="spec-results-stat-value" style={{ color: '#4ade80' }}>
            {animAccept}%
          </span>
          <span className="spec-results-stat-name">AVG ACCEPTANCE</span>
        </div>
        <div className="spec-results-stat">
          <span className="spec-results-stat-value" style={{ color: 'var(--blue)' }}>
            {animTps}
          </span>
          <span className="spec-results-stat-name">PEAK EVAL TPS</span>
        </div>
      </div>

      <div className="spec-results-draft-line">
        Draft: <span>{draftName}</span>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const SpeculativeDecodingPage: React.FC = () => {
  // Models + hardware
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [vramGb, setVramGb] = useState<number | null>(null)

  // Draft recommendations
  const [drafts, setDrafts] = useState<DraftModelCandidate[]>([])
  const [selectedDraft, setSelectedDraft] = useState<DraftModelCandidate | null>(null)
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [draftsError, setDraftsError] = useState<string | null>(null)

  // Benchmark state
  const [status, setStatus] = useState<PageStatus>('idle')
  const [specTicks, setSpecTicks] = useState<SpecTick[]>([])
  const [latestMetric, setLatestMetric] = useState<MetricTick | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const startTimeRef = useRef(0)

  // ---- Load models on mount ----
  const loadModels = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_BASE_URL}/models`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data: ModelInfo[] = await res.json()
        setModels(data)
        if (data.length > 0) {
          setSelectedModel(data[0].path)
        }
      }
    } catch {
      setModels([])
    }
  }, [])

  // ---- Load hardware on mount ----
  const loadHardware = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_BASE_URL}/hardware`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data: HardwareResponse = await res.json()
        setVramGb(data.gpu.vram_total_gb)
      }
    } catch {
      setVramGb(null)
    }
  }, [])

  useEffect(() => {
    loadModels()
    loadHardware()
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Fetch draft recommendations ----
  const handleFindDrafts = useCallback(async () => {
    if (!selectedModel) return
    setLoadingDrafts(true)
    setDrafts([])
    setSelectedDraft(null)
    setDraftsError(null)

    const targetName =
      models.find(m => m.path === selectedModel)?.name ?? selectedModel
    const vramParam = vramGb !== null ? vramGb : 8

    try {
      const result = await get<DraftModelCandidate[]>(
        `/speculative/recommendations?target_model=${encodeURIComponent(targetName)}&vram_gb=${vramParam}`
      )
      setDrafts(result)
      if (result.length === 0) {
        setDraftsError('No draft model candidates found for this target.')
      }
    } catch {
      setDraftsError('Failed to reach backend. Check your connection.')
    } finally {
      setLoadingDrafts(false)
    }
  }, [selectedModel, models, vramGb])

  // ---- WebSocket ----
  const connectWebSocket = useCallback((sid: string) => {
    const ws = createMetricsSocket(sid)
    wsRef.current = ws

    ws.onmessage = (e: MessageEvent) => {
      const event: AgentWebSocketEvent = JSON.parse(e.data as string)

      if (event.event === 'status_update') {
        setStatus(event.payload.status)
      } else if (event.event === 'metric_tick') {
        setLatestMetric({
          eval_tps: event.payload.eval_tps,
          vram_mb: event.payload.vram_used_mb,
          cpu_pct: event.payload.cpu_usage_percent,
        })
      } else if (event.event === 'speculative_tick') {
        const t = (Date.now() - startTimeRef.current) / 1000
        setSpecTicks(prev => [
          ...prev,
          {
            proposed: event.payload.draft_tokens_proposed,
            accepted: event.payload.draft_tokens_accepted,
            acceptance_rate: event.payload.acceptance_rate,
            speedup: event.payload.net_speedup_multiplier,
            t,
          },
        ])
      }
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    ws.onerror = () => {
      wsRef.current = null
    }
  }, [])

  // ---- Start benchmark ----
  const handleStart = useCallback(async () => {
    if (!selectedModel || !selectedDraft) return
    setSpecTicks([])
    setLatestMetric(null)
    setStatus('loading_model')
    startTimeRef.current = Date.now()

    try {
      const res = await fetch(`${AGENT_BASE_URL}/benchmark/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_path: selectedModel,
          draft_model_path: selectedDraft.hf_model_id,
          context_size: 2048,
          batch_size: 512,
          threads: 4,
          gpu_layers: 0,
        }),
      })

      if (!res.ok) {
        setStatus('failed')
        return
      }

      const data: BenchmarkStartResponse = await res.json()
      setSessionId(data.session_id)
      connectWebSocket(data.session_id)
    } catch {
      setStatus('failed')
    }
  }, [selectedModel, selectedDraft, connectWebSocket])

  // ---- Stop benchmark ----
  const handleStop = useCallback(async () => {
    if (!sessionId) return

    try {
      await fetch(`${AGENT_BASE_URL}/benchmark/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
    } catch {
      // best-effort
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus('idle')
    setSessionId(null)
  }, [sessionId])

  // ---- Derived state ----
  const isRunning =
    status === 'loading_model' || status === 'warming_up' || status === 'generating'
  const isCompleted = status === 'completed'
  const canRun = !!selectedModel && !!selectedDraft && !isRunning

  const latestTick = specTicks[specTicks.length - 1] ?? null
  const currentSpeedup = latestTick?.speedup ?? null
  const currentAcceptance = latestTick?.acceptance_rate ?? null

  const showExplainer = status === 'idle' && specTicks.length === 0

  return (
    <MotionConfig reducedMotion="user">
      <div className="spec-page">
        {/* Nav */}
        <nav className="spec-nav">
          <span className="spec-nav-brand">EverythingLLM</span>
          <span className="spec-nav-module">Speculative Decoding Advisor</span>
        </nav>

        {/* Demo mode banner — always visible */}
        <div className="spec-demo-banner">
          <span className="spec-demo-banner-label">⚠ DEMO / EDUCATIONAL MODE</span>
          <span className="spec-demo-banner-desc">
            Speculative decoding results on this page are simulated for illustration purposes.
            Real dual-model inference is not yet implemented.
          </span>
        </div>

        <div className="spec-layout">
          {/* ── Left: Config panel ── */}
          <div className="spec-config-panel">

            {/* Section 1: Target model */}
            <div className="spec-config-section">
              <div className="spec-field-label">TARGET MODEL</div>
              {models.length === 0 ? (
                <div className="spec-no-models">No .gguf models found</div>
              ) : (
                <select
                  className="spec-model-select"
                  value={selectedModel}
                  onChange={e => {
                    setSelectedModel(e.target.value)
                    setDrafts([])
                    setSelectedDraft(null)
                    setDraftsError(null)
                  }}
                  disabled={isRunning}
                >
                  {models.map(m => (
                    <option key={m.path} value={m.path}>
                      {m.name} ({m.size_gb.toFixed(1)} GB)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Section 2: Hardware */}
            <div className="spec-config-section">
              <div className="spec-field-label">HARDWARE</div>
              <div className="spec-hardware-row">
                <span className="spec-hardware-vram">
                  VRAM:{' '}
                  <span className="spec-hardware-vram-value">
                    {vramGb !== null ? `${vramGb.toFixed(1)} GB` : '—'}
                  </span>
                </span>
                {vramGb !== null && (
                  <span className="spec-hardware-badge">auto-detected</span>
                )}
              </div>
            </div>

            {/* Section 3: Draft model recommendations */}
            <div className="spec-config-section">
              <div className="spec-field-label">DRAFT MODEL</div>

              <motion.button
                className="spec-find-btn"
                onClick={handleFindDrafts}
                disabled={!selectedModel || loadingDrafts || isRunning}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {loadingDrafts ? 'SEARCHING...' : 'FIND DRAFT MODELS'}
              </motion.button>

              <AnimatePresence mode="wait">
                {loadingDrafts && (
                  <motion.div
                    key="skeletons"
                    className="spec-drafts-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </motion.div>
                )}

                {!loadingDrafts && drafts.length > 0 && (
                  <motion.div
                    key="draft-cards"
                    className="spec-drafts-grid"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {drafts.slice(0, 4).map(candidate => (
                      <DraftCandidateCard
                        key={candidate.hf_model_id}
                        candidate={candidate}
                        selected={selectedDraft?.hf_model_id === candidate.hf_model_id}
                        onSelect={() =>
                          setSelectedDraft(
                            selectedDraft?.hf_model_id === candidate.hf_model_id
                              ? null
                              : candidate
                          )
                        }
                      />
                    ))}
                  </motion.div>
                )}

                {!loadingDrafts && draftsError && (
                  <motion.div
                    key="drafts-error"
                    className="spec-drafts-error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {draftsError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Section 4: Status + run controls */}
            <div className="spec-config-section">
              <div
                className="spec-status-badge"
                style={{
                  borderColor: STATUS_COLORS[status],
                  color: STATUS_COLORS[status],
                }}
              >
                <span
                  className="spec-status-dot"
                  style={{ background: STATUS_COLORS[status] }}
                />
                {STATUS_LABELS[status]}
              </div>

              <div className="spec-actions">
                {!isRunning ? (
                  <motion.button
                    className="spec-run-btn"
                    onClick={handleStart}
                    disabled={!canRun}
                    whileHover={{ scale: canRun ? 1.02 : 1 }}
                    whileTap={{ scale: canRun ? 0.97 : 1 }}
                  >
                    ▶ RUN SPECULATIVE BENCHMARK
                  </motion.button>
                ) : (
                  <motion.button
                    className="spec-stop-btn"
                    onClick={handleStop}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    ■ STOP
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Metrics panel ── */}
          <div className="spec-chart-panel">
            <AnimatePresence mode="wait">
              {showExplainer ? (
                /* Idle: show explainer */
                <motion.div
                  key="explainer"
                  className="spec-explainer-wrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4 }}
                >
                  <SpeculativeDecodingExplainer />
                </motion.div>
              ) : (
                /* Active / completed: show live metrics */
                <motion.div
                  key="metrics"
                  className="spec-metrics-panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Large speedup display */}
                  <div className="spec-speedup-display">
                    <div className="spec-speedup-label">NET SPEEDUP</div>
                    <motion.div
                      className="spec-speedup-number"
                      key={currentSpeedup?.toFixed(1)}
                      animate={{ scale: [1.08, 1] }}
                      transition={{ duration: 0.25 }}
                    >
                      {currentSpeedup !== null
                        ? `${currentSpeedup.toFixed(2)}x`
                        : '—'}
                    </motion.div>
                  </div>

                  {/* Acceptance rate bar */}
                  {currentAcceptance !== null && (
                    <AcceptanceBar rate={currentAcceptance} />
                  )}

                  {/* Token stream */}
                  {specTicks.length > 0 && (
                    <TokenStream specTicks={specTicks} />
                  )}

                  {/* Stat cards */}
                  <AnimatePresence>
                    {latestMetric && (
                      <motion.div
                        className="spec-metrics-row"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <div
                          className="spec-metric-card"
                          style={{ '--card-accent': 'var(--blue)' } as React.CSSProperties}
                        >
                          <span
                            className="spec-metric-value"
                            style={{ color: 'var(--blue)' }}
                          >
                            {Math.round(latestMetric.eval_tps)}
                          </span>
                          <span className="spec-metric-label">EVAL TPS</span>
                        </div>
                        <div
                          className="spec-metric-card"
                          style={{ '--card-accent': 'var(--violet)' } as React.CSSProperties}
                        >
                          <span
                            className="spec-metric-value"
                            style={{ color: 'var(--violet)' }}
                          >
                            {Math.round(latestMetric.vram_mb).toLocaleString()}
                          </span>
                          <span className="spec-metric-label">VRAM MB</span>
                        </div>
                        <div
                          className="spec-metric-card"
                          style={{ '--card-accent': '#fb923c' } as React.CSSProperties}
                        >
                          <span
                            className="spec-metric-value"
                            style={{ color: '#fb923c' }}
                          >
                            {Math.round(latestMetric.cpu_pct)}%
                          </span>
                          <span className="spec-metric-label">CPU %</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Results card on completion */}
                  <AnimatePresence>
                    {isCompleted && specTicks.length > 0 && (
                      <SpecResultsCard
                        key="spec-results"
                        specTicks={specTicks}
                        latestMetric={latestMetric}
                        draftName={selectedDraft?.name ?? ''}
                      />
                    )}
                  </AnimatePresence>

                  {/* Waiting state when not yet generating */}
                  {specTicks.length === 0 && !isCompleted && (
                    <motion.div
                      className="spec-waiting"
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {STATUS_LABELS[status] === 'IDLE'
                        ? 'Configure and run a benchmark above'
                        : `${STATUS_LABELS[status]}...`}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}

export default SpeculativeDecodingPage
