import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import BenchmarkerExplainer from '../components/animations/BenchmarkerExplainer'
import { useCountUp } from '../hooks/useCountUp'
import { AGENT_BASE_URL } from '../utils/agentClient'
import { post } from '../utils/apiClient'
import type {
  BenchmarkStatus,
  BenchmarkStartResponse,
  AgentWebSocketEvent,
} from '../types/contracts'
import type { SaveBenchmarkRequest, SaveBenchmarkResponse } from '../types/contracts'
import './BenchmarkerPage.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelInfo {
  name: string
  path: string
  size_gb: number
}

interface BenchConfig {
  context_size: number
  batch_size: number
  threads: number
  gpu_layers: number
}

interface TickData {
  t: number
  eval_tps: number
  prompt_eval_tps: number
  vram_mb: number
  cpu_pct: number
  temp: number | null
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
  loading_model: 'var(--yellow)',
  warming_up: 'var(--yellow)',
  generating: 'var(--blue)',
  completed: '#4ade80',
  failed: '#f87171',
}

// ---------------------------------------------------------------------------
// LiveTpsChart
// ---------------------------------------------------------------------------

function LiveTpsChart({ ticks }: { ticks: TickData[] }) {
  const W = 560
  const H = 220
  const PAD = { top: 16, right: 16, bottom: 32, left: 48 }

  if (ticks.length === 0) {
    return (
      <div className="bench-chart-empty">
        <span>Waiting for benchmark data...</span>
      </div>
    )
  }

  const maxT = Math.max(ticks[ticks.length - 1].t, 10)
  const maxTps = Math.max(...ticks.map(d => Math.max(d.eval_tps, d.prompt_eval_tps)), 20)

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const xScale = (t: number) => PAD.left + (t / maxT) * innerW
  const yScale = (tps: number) => PAD.top + innerH - (tps / maxTps) * innerH

  const evalPoints = ticks.map(d => `${xScale(d.t)},${yScale(d.eval_tps)}`).join(' ')
  const promptPoints = ticks.map(d => `${xScale(d.t)},${yScale(d.prompt_eval_tps)}`).join(' ')

  const gridLines = [0, 0.25, 0.5, 0.75, 1.0].map(frac => ({
    y: PAD.top + innerH * (1 - frac),
    label: Math.round(maxTps * frac),
  }))

  const lastTick = ticks[ticks.length - 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="bench-chart-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={g.y}
            x2={W - PAD.right} y2={g.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          <text
            x={PAD.left - 6} y={g.y + 4}
            textAnchor="end"
            fill="rgba(255,255,255,0.3)"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
          >
            {g.label}
          </text>
        </g>
      ))}

      {/* Prompt TPS line (violet) */}
      {ticks.length > 1 && (
        <polyline
          points={promptPoints}
          fill="none"
          stroke="var(--violet)"
          strokeWidth="1.5"
          opacity="0.6"
        />
      )}

      {/* Eval TPS line (blue) */}
      {ticks.length > 1 && (
        <polyline
          points={evalPoints}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="2"
        />
      )}

      {/* Glow dot on latest eval_tps point */}
      {ticks.length > 0 && (
        <motion.circle
          cx={xScale(lastTick.t)}
          cy={yScale(lastTick.eval_tps)}
          r={5}
          fill="var(--blue)"
          animate={{ opacity: [1, 0.4, 1], scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{ filter: 'drop-shadow(0 0 6px var(--blue))' }}
        />
      )}

      {/* X axis label */}
      <text
        x={W / 2} y={H - 4}
        textAnchor="middle"
        fill="rgba(255,255,255,0.3)"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
      >
        TIME (s)
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Results summary card
// ---------------------------------------------------------------------------

function ResultsCard({ ticks, config }: { ticks: TickData[]; config: BenchConfig }) {
  const peakEval = Math.max(...ticks.map(d => d.eval_tps), 0)
  const peakPrompt = Math.max(...ticks.map(d => d.prompt_eval_tps), 0)

  const animPeakEval = useCountUp(Math.round(peakEval), 900, 0)
  const animPeakPrompt = useCountUp(Math.round(peakPrompt), 900, 150)

  return (
    <motion.div
      className="bench-results-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="bench-results-header">
        <span className="bench-results-label">BENCHMARK RESULTS</span>
      </div>

      <div className="bench-results-stats">
        <div className="bench-results-stat">
          <span className="bench-results-stat-value" style={{ color: 'var(--blue)' }}>
            {animPeakEval}
          </span>
          <span className="bench-results-stat-unit">TPS</span>
          <span className="bench-results-stat-name">PEAK EVAL</span>
        </div>
        <div className="bench-results-stat">
          <span className="bench-results-stat-value" style={{ color: 'var(--violet)' }}>
            {animPeakPrompt}
          </span>
          <span className="bench-results-stat-unit">TPS</span>
          <span className="bench-results-stat-name">PEAK PROMPT</span>
        </div>
      </div>

      <div className="bench-results-config">
        <span className="bench-results-config-label">CONFIG</span>
        <div className="bench-results-config-row">
          <span>THREADS</span><span>{config.threads}</span>
        </div>
        <div className="bench-results-config-row">
          <span>BATCH SIZE</span><span>{config.batch_size}</span>
        </div>
        <div className="bench-results-config-row">
          <span>CONTEXT</span><span>{config.context_size}</span>
        </div>
        <div className="bench-results-config-row">
          <span>GPU LAYERS</span><span>{config.gpu_layers}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Slider row
// ---------------------------------------------------------------------------

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  accentColor?: string
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, accentColor = 'var(--blue)', onChange }: SliderRowProps) {
  return (
    <div className="bench-slider-row">
      <div className="bench-slider-header">
        <span className="bench-slider-label">{label}</span>
        <span className="bench-slider-value" style={{ color: accentColor }}>{value}</span>
      </div>
      <input
        type="range"
        className="bench-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--accent': accentColor } as React.CSSProperties}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const BenchmarkerPage: React.FC = () => {
  // Agent + models
  const [agentOnline, setAgentOnline] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')

  // Config
  const [config, setConfig] = useState<BenchConfig>({
    context_size: 2048,
    batch_size: 512,
    threads: 4,
    gpu_layers: 0,
  })

  // Benchmark state
  const [status, setStatus] = useState<PageStatus>('idle')
  const [ticks, setTicks] = useState<TickData[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Live metrics (latest tick)
  const [latestTick, setLatestTick] = useState<TickData | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const startTimeRef = useRef<number>(0)
  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- Health polling ----
  const pollHealth = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_BASE_URL}/health`, {
        signal: AbortSignal.timeout(2000),
      })
      setAgentOnline(res.ok)
    } catch {
      setAgentOnline(false)
    }
  }, [])

  // ---- Load models ----
  const loadModels = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_BASE_URL}/models`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data: ModelInfo[] = await res.json()
        setModels(data)
        if (data.length > 0 && !selectedModel) {
          setSelectedModel(data[0].path)
        }
      }
    } catch {
      setModels([])
    }
  }, [selectedModel])

  useEffect(() => {
    pollHealth()
    loadModels()
    healthIntervalRef.current = setInterval(pollHealth, 5000)
    return () => {
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- WebSocket ----
  const connectWebSocket = useCallback((sid: string) => {
    const ws = new WebSocket(`ws://localhost:7878/ws/metrics/${sid}`)
    wsRef.current = ws

    ws.onmessage = (e: MessageEvent) => {
      const event: AgentWebSocketEvent = JSON.parse(e.data as string)

      if (event.event === 'status_update') {
        setStatus(event.payload.status)
      } else if (event.event === 'metric_tick') {
        const t = (Date.now() - startTimeRef.current) / 1000
        const tick: TickData = {
          t,
          eval_tps: event.payload.eval_tps,
          prompt_eval_tps: event.payload.prompt_eval_tps,
          vram_mb: event.payload.vram_used_mb,
          cpu_pct: event.payload.cpu_usage_percent,
          temp: event.payload.temperature_c,
        }
        setTicks(prev => [...prev, tick])
        setLatestTick(tick)
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
    if (!agentOnline) return
    const modelPath = selectedModel || 'simulation'
    setTicks([])
    setLatestTick(null)
    setSaved(false)
    setStatus('loading_model')
    startTimeRef.current = Date.now()

    try {
      const res = await fetch(`${AGENT_BASE_URL}/benchmark/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_path: modelPath,
          draft_model_path: null,
          context_size: config.context_size,
          batch_size: config.batch_size,
          threads: config.threads,
          gpu_layers: config.gpu_layers,
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
  }, [selectedModel, agentOnline, config, connectWebSocket])

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

  // ---- Save result ----
  const handleSave = useCallback(async () => {
    if (!ticks.length || saving) return
    setSaving(true)

    const peakEval = Math.max(...ticks.map(d => d.eval_tps), 0)
    const peakPrompt = Math.max(...ticks.map(d => d.prompt_eval_tps), 0)

    const selectedModelInfo = models.find(m => m.path === selectedModel)
    const modelId = selectedModelInfo?.name ?? selectedModel

    const body: SaveBenchmarkRequest = {
      model_id: modelId,
      config: {
        threads: config.threads,
        parallel: 1,
        context_size: config.context_size,
        batch_size: config.batch_size,
        gpu_layers: config.gpu_layers,
      },
      results: {
        peak_eval_tps: peakEval,
        peak_prompt_tps: peakPrompt,
        best_threads: config.threads,
        best_parallel: 1,
        sweep_data: { ticks },
      },
      is_speculative: false,
      draft_model_id: null,
    }

    try {
      await post<SaveBenchmarkResponse>('/benchmarks/save', body)
      setSaved(true)
    } catch {
      // show error state optionally
    } finally {
      setSaving(false)
    }
  }, [ticks, saving, models, selectedModel, config])

  const isRunning = status === 'loading_model' || status === 'warming_up' || status === 'generating'
  const isCompleted = status === 'completed'
  const showExplainer = status === 'idle' && ticks.length === 0

  // ---- Derived latest values ----
  const vramDisplay = latestTick ? Math.round(latestTick.vram_mb) : 0
  const cpuDisplay = latestTick ? Math.round(latestTick.cpu_pct) : 0
  const tempDisplay = latestTick?.temp != null ? Math.round(latestTick.temp) : null

  return (
    <MotionConfig reducedMotion="user">
      <div className="bench-page">
        {/* Nav */}
        <nav className="bench-nav">
          <span className="bench-nav-brand">EverythingLLM</span>
          <span className="bench-nav-module">Throughput Benchmarker</span>
        </nav>

        <div className="bench-layout">
          {/* ── Left: Config panel ── */}
          <div className="bench-config-panel">
            {/* Agent status */}
            <div className="bench-agent-status">
              <span
                className="bench-agent-dot"
                style={{ background: agentOnline ? '#4ade80' : '#f87171' }}
              />
              <span
                className="bench-agent-label"
                style={{ color: agentOnline ? '#4ade80' : '#f87171' }}
              >
                {agentOnline ? 'AGENT ONLINE' : 'AGENT OFFLINE'}
              </span>
            </div>

            {/* Model selector */}
            <div className="bench-model-select-wrapper">
              <label className="bench-field-label">MODEL</label>
              {models.length === 0 ? (
                <div className="bench-no-models">No .gguf models found — running in simulation mode</div>
              ) : (
                <select
                  className="bench-model-select"
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
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

            {/* Sliders */}
            <div className="bench-sliders">
              <SliderRow
                label="CONTEXT SIZE"
                value={config.context_size}
                min={512}
                max={8192}
                step={512}
                accentColor="var(--blue)"
                onChange={v => setConfig(prev => ({ ...prev, context_size: v }))}
              />
              <SliderRow
                label="BATCH SIZE"
                value={config.batch_size}
                min={64}
                max={1024}
                step={64}
                accentColor="var(--violet)"
                onChange={v => setConfig(prev => ({ ...prev, batch_size: v }))}
              />
              <SliderRow
                label="THREADS"
                value={config.threads}
                min={1}
                max={16}
                step={1}
                accentColor="var(--blue)"
                onChange={v => setConfig(prev => ({ ...prev, threads: v }))}
              />
              <SliderRow
                label="GPU LAYERS"
                value={config.gpu_layers}
                min={0}
                max={99}
                step={1}
                accentColor="var(--violet)"
                onChange={v => setConfig(prev => ({ ...prev, gpu_layers: v }))}
              />
            </div>

            {/* Status badge */}
            <div className="bench-status-badge" style={{ borderColor: STATUS_COLORS[status], color: STATUS_COLORS[status] }}>
              <span
                className="bench-status-dot"
                style={{ background: STATUS_COLORS[status] }}
              />
              {STATUS_LABELS[status]}
            </div>

            {/* Start / Stop */}
            <div className="bench-actions">
              {!isRunning ? (
                <motion.button
                  className="bench-run-btn"
                  onClick={handleStart}
                  disabled={!agentOnline}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  ▶ RUN BENCHMARK
                </motion.button>
              ) : (
                <motion.button
                  className="bench-stop-btn"
                  onClick={handleStop}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  ■ STOP
                </motion.button>
              )}

              <AnimatePresence>
                {isCompleted && !saved && (
                  <motion.button
                    key="save-btn"
                    className="bench-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {saving ? 'SAVING...' : 'SAVE RESULT'}
                  </motion.button>
                )}
                {isCompleted && saved && (
                  <motion.div
                    key="saved-badge"
                    className="bench-saved-badge"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    SAVED ✓
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Right: Chart + results ── */}
          <div className="bench-chart-panel">
            {/* Legend */}
            <div className="bench-chart-legend">
              <span className="bench-legend-dot" style={{ background: 'var(--blue)' }} />
              <span className="bench-legend-label">EVAL TPS</span>
              <span className="bench-legend-dot" style={{ background: 'var(--violet)' }} />
              <span className="bench-legend-label">PROMPT TPS</span>
            </div>

            {/* Chart */}
            <div className="bench-chart-wrapper">
              <LiveTpsChart ticks={ticks} />
            </div>

            {/* Live metrics row */}
            <AnimatePresence>
              {latestTick && (
                <motion.div
                  className="bench-metrics-row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="bench-metric-card" style={{ '--card-accent': 'var(--blue)' } as React.CSSProperties}>
                    <span className="bench-metric-value" style={{ color: 'var(--blue)' }}>
                      {vramDisplay.toLocaleString()}
                    </span>
                    <span className="bench-metric-label">VRAM USED (MB)</span>
                  </div>
                  <div className="bench-metric-card" style={{ '--card-accent': '#fb923c' } as React.CSSProperties}>
                    <span className="bench-metric-value" style={{ color: '#fb923c' }}>
                      {cpuDisplay}%
                    </span>
                    <span className="bench-metric-label">CPU %</span>
                  </div>
                  <div className="bench-metric-card" style={{ '--card-accent': '#facc15' } as React.CSSProperties}>
                    <span className="bench-metric-value" style={{ color: '#facc15' }}>
                      {tempDisplay !== null ? `${tempDisplay}°` : '—'}
                    </span>
                    <span className="bench-metric-label">TEMP (°C)</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results card after completion */}
            <AnimatePresence>
              {isCompleted && ticks.length > 0 && (
                <ResultsCard key="results" ticks={ticks} config={config} />
              )}
            </AnimatePresence>

            {/* Explainer — shown only when idle with no data */}
            <AnimatePresence>
              {showExplainer && (
                <motion.div
                  key="explainer"
                  className="bench-explainer-wrapper"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bench-explainer-label">SWEEP VISUALIZED</div>
                  <BenchmarkerExplainer />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}

export default BenchmarkerPage
