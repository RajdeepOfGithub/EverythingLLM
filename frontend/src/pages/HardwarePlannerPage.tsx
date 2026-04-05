import React, { useEffect, useReducer, useRef } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { HardwareResponse } from '../types/contracts'
import HardwarePlannerExplainer from '../components/animations/HardwarePlannerExplainer'
import {
  calculateHardware,
  quantComparison,
  QUANT_KEYS,
  GRID_GPUS,
  gridFitResult,
  CLOUD_OPTIONS,
  cloudFits,
  type QuantKey,
  type HWCalcResult,
} from '../utils/hwCalc'
import './HardwarePlannerPage.css'

// ---------------------------------------------------------------------------
// Model pool
// ---------------------------------------------------------------------------

interface ModelOption {
  key: string
  label: string
  params: number // billions
}

const MODEL_POOL: ModelOption[] = [
  { key: 'llama-70b',     label: 'Llama 3.3 70B',             params: 70   },
  { key: 'mistral-24b',   label: 'Mistral Small 3.1 24B',     params: 24   },
  { key: 'qwen-coder-32b',label: 'Qwen 2.5 Coder 32B',        params: 32   },
  { key: 'gemma-27b',     label: 'Gemma 3 27B',               params: 27   },
  { key: 'deepseek-16b',  label: 'DeepSeek Coder V2 Lite',    params: 16   },
  { key: 'qwen-14b',      label: 'Qwen 2.5 14B',              params: 14   },
  { key: 'phi3-mini',     label: 'Phi-3 Mini',                params: 3.8  },
  { key: 'llama-3b',      label: 'Llama 3.2 3B',              params: 3    },
  { key: 'custom',        label: 'Custom (manual entry)',      params: 0    },
]

type Framework = 'llama.cpp' | 'vllm' | 'tensorrt'

// ---------------------------------------------------------------------------
// State / Reducer
// ---------------------------------------------------------------------------

interface HWState {
  // Model
  selectedModel: string
  customParams: number
  framework: Framework

  // Controls
  quant: QuantKey
  contextLen: number
  batchSize: number
  gpuLayers: number

  // Hardware
  detectedHardware: HardwareResponse | null
  manualVram: number
  manualRam: number
  agentReachable: boolean
  overrideDetected: boolean // user asked to type manually even though agent responded

  // UI
  explainerOpen: boolean
}

type Action =
  | { type: 'SET_MODEL'; model: string }
  | { type: 'SET_CUSTOM_PARAMS'; params: number }
  | { type: 'SET_FRAMEWORK'; fw: Framework }
  | { type: 'SET_QUANT'; quant: QuantKey }
  | { type: 'SET_CONTEXT'; len: number }
  | { type: 'SET_BATCH'; size: number }
  | { type: 'SET_GPU_LAYERS'; pct: number }
  | { type: 'SET_DETECTED'; hw: HardwareResponse }
  | { type: 'AGENT_OFFLINE' }
  | { type: 'SET_MANUAL_VRAM'; gb: number }
  | { type: 'SET_MANUAL_RAM'; gb: number }
  | { type: 'TOGGLE_OVERRIDE' }
  | { type: 'TOGGLE_EXPLAINER' }

const initialState: HWState = {
  selectedModel: 'qwen-14b',
  customParams: 7,
  framework: 'llama.cpp',
  quant: 'Q4_K_M',
  contextLen: 4096,
  batchSize: 1,
  gpuLayers: 100,
  detectedHardware: null,
  manualVram: 12,
  manualRam: 32,
  agentReachable: false,
  overrideDetected: false,
  explainerOpen: false,
}

function reducer(state: HWState, action: Action): HWState {
  switch (action.type) {
    case 'SET_MODEL':         return { ...state, selectedModel: action.model }
    case 'SET_CUSTOM_PARAMS': return { ...state, customParams: action.params }
    case 'SET_FRAMEWORK':     return { ...state, framework: action.fw }
    case 'SET_QUANT':         return { ...state, quant: action.quant }
    case 'SET_CONTEXT':       return { ...state, contextLen: action.len }
    case 'SET_BATCH':         return { ...state, batchSize: action.size }
    case 'SET_GPU_LAYERS':    return { ...state, gpuLayers: action.pct }
    case 'SET_DETECTED':      return { ...state, detectedHardware: action.hw, agentReachable: true }
    case 'AGENT_OFFLINE':     return { ...state, agentReachable: false }
    case 'SET_MANUAL_VRAM':   return { ...state, manualVram: action.gb }
    case 'SET_MANUAL_RAM':    return { ...state, manualRam: action.gb }
    case 'TOGGLE_OVERRIDE':   return { ...state, overrideDetected: !state.overrideDetected }
    case 'TOGGLE_EXPLAINER':  return { ...state, explainerOpen: !state.explainerOpen }
    default:                  return state
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveParams(state: HWState): number {
  if (state.selectedModel === 'custom') return state.customParams
  return MODEL_POOL.find(m => m.key === state.selectedModel)?.params ?? 7
}

function resolveVram(state: HWState): number {
  if (state.agentReachable && !state.overrideDetected && state.detectedHardware) {
    return state.detectedHardware.gpu.vram_total_gb ?? state.manualVram
  }
  return state.manualVram
}

function resolveRam(state: HWState): number {
  if (state.agentReachable && !state.overrideDetected && state.detectedHardware) {
    return state.detectedHardware.system.ram_total_gb
  }
  return state.manualRam
}

function formatContext(len: number): string {
  if (len >= 1024) return `${len / 1024}K`
  return `${len}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface VRAMBarProps {
  result: HWCalcResult
  availableVramGb: number
}

const VRAMBar: React.FC<VRAMBarProps> = ({ result, availableVramGb }) => {
  const cap = Math.max(availableVramGb, result.totalVramGb) * 1.05
  const weightsPct  = (result.modelWeightsGb / cap) * 100
  const kvPct       = (result.kvCacheGb       / cap) * 100
  const overheadPct = (result.overheadGb      / cap) * 100
  const isOverflow  = result.verdict === 'over'

  return (
    <div className="hp-vram-bar-wrap">
      <div className="hp-vram-bar-label">VRAM BREAKDOWN</div>
      <div className={`hp-vram-track${isOverflow ? ' overflow' : ''}`}>
        <div
          className="hp-vram-segment weights"
          style={{ width: `${weightsPct}%` }}
        >
          {weightsPct > 12 && (
            <span className="hp-vram-segment-label">
              {result.modelWeightsGb.toFixed(1)} GB
            </span>
          )}
        </div>
        <div
          className="hp-vram-segment kvcache"
          style={{ width: `${kvPct}%` }}
        >
          {kvPct > 10 && (
            <span className="hp-vram-segment-label">
              {result.kvCacheGb.toFixed(1)} GB
            </span>
          )}
        </div>
        <div
          className="hp-vram-segment overhead"
          style={{ width: `${overheadPct}%` }}
        >
          {overheadPct > 8 && (
            <span className="hp-vram-segment-label">
              {result.overheadGb.toFixed(1)} GB
            </span>
          )}
        </div>
      </div>

      <div className="hp-vram-totals">
        <span className="hp-vram-total-text">
          {result.totalVramGb.toFixed(1)} GB total
        </span>
        <span className="hp-vram-available-text">
          {availableVramGb.toFixed(1)} GB available
        </span>
      </div>

      <div className="hp-vram-legend">
        <div className="hp-vram-legend-item">
          <div className="hp-vram-legend-dot" style={{ background: 'var(--violet)' }} />
          Weights
        </div>
        <div className="hp-vram-legend-item">
          <div className="hp-vram-legend-dot" style={{ background: 'var(--blue)' }} />
          KV Cache
        </div>
        <div className="hp-vram-legend-item">
          <div className="hp-vram-legend-dot" style={{ background: 'var(--orange)' }} />
          Overhead
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const CONTEXT_MARKS = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072]

const HardwarePlannerPage: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const hasFetchedRef = useRef(false)

  // Attempt to reach local agent on mount
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 3000)

    fetch('http://localhost:7878/api/v1/hardware', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('non-ok')
        return r.json() as Promise<HardwareResponse>
      })
      .then(hw => dispatch({ type: 'SET_DETECTED', hw }))
      .catch(() => dispatch({ type: 'AGENT_OFFLINE' }))
      .finally(() => clearTimeout(id))
  }, [])

  // Derived values
  const paramsBillions = resolveParams(state)
  const gpuVramGb      = resolveVram(state)
  const ramGb          = resolveRam(state)

  const result = calculateHardware({
    paramsBillions,
    quant:      state.quant,
    contextLen: state.contextLen,
    batchSize:  state.batchSize,
    gpuLayers:  state.gpuLayers,
    gpuVramGb,
    ramGb,
  })

  const quantRows = quantComparison(paramsBillions, state.contextLen, state.batchSize, gpuVramGb)

  const maxQuantVram = Math.max(...quantRows.map(r => r.vramGb))

  const verdictLabel: Record<string, string> = {
    fit:   '✓ FITS IN VRAM',
    tight: '⚠ TIGHT FIT',
    over:  '✗ EXCEEDS VRAM',
  }

  // Context slider: find nearest mark index
  const contextIndex = (() => {
    let best = 0
    CONTEXT_MARKS.forEach((v, i) => {
      if (Math.abs(v - state.contextLen) < Math.abs(CONTEXT_MARKS[best] - state.contextLen)) best = i
    })
    return best
  })()

  const showCloud = result.verdict === 'over'

  return (
    <MotionConfig reducedMotion="user">
      <div className="hp-page">

        {/* Nav */}
        <nav className="hw-nav">
          <span className="hw-nav-brand">EverythingLLM</span>
          <span className="hw-nav-sep">/</span>
          <span className="hw-nav-module">Hardware Planner</span>
        </nav>

        <div className="hp-content">

          {/* ── Section 1: Inputs ──────────────────────────────────────────── */}
          <section>
            <div className="hp-section-label">01 — CONFIGURE</div>
            <div className="hp-inputs-row">

              {/* Model group */}
              <div className="hp-input-group">
                <div className="hp-input-group-label">MODEL</div>

                <div className="hp-field">
                  <div className="hp-field-label">Select model</div>
                  <select
                    className="hp-select"
                    value={state.selectedModel}
                    onChange={e => dispatch({ type: 'SET_MODEL', model: e.target.value })}
                  >
                    {MODEL_POOL.map(m => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {state.selectedModel === 'custom' && (
                  <div className="hp-field">
                    <div className="hp-field-label">Parameters (billions)</div>
                    <input
                      type="number"
                      className="hp-number-input"
                      min={0.1}
                      max={700}
                      step={0.1}
                      value={state.customParams}
                      onChange={e =>
                        dispatch({ type: 'SET_CUSTOM_PARAMS', params: parseFloat(e.target.value) || 7 })
                      }
                    />
                  </div>
                )}

                <div className="hp-field">
                  <div className="hp-field-label">Inference framework</div>
                  <div className="hp-radio-group">
                    {(['llama.cpp', 'vllm', 'tensorrt'] as Framework[]).map(fw => (
                      <button
                        key={fw}
                        className={`hp-radio-btn${state.framework === fw ? ' active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_FRAMEWORK', fw })}
                      >
                        {fw}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hardware group */}
              <div className="hp-input-group">
                <div className="hp-input-group-label">YOUR HARDWARE</div>

                {state.agentReachable && state.detectedHardware && !state.overrideDetected ? (
                  <>
                    <div className="hp-hardware-info">
                      <div className="hp-detected-badge">
                        <span className="hp-detected-dot" />
                        DETECTED
                      </div>
                      <div className="hp-hw-name">
                        {state.detectedHardware.gpu.name ?? 'Unknown GPU'}
                      </div>
                      <div className="hp-hw-vram">
                        {(state.detectedHardware.gpu.vram_total_gb ?? 0).toFixed(1)} GB VRAM
                        &nbsp;·&nbsp;
                        {state.detectedHardware.system.ram_total_gb.toFixed(0)} GB RAM
                      </div>
                    </div>
                    <button
                      className="hp-hw-override-btn"
                      onClick={() => dispatch({ type: 'TOGGLE_OVERRIDE' })}
                    >
                      Override manually
                    </button>
                  </>
                ) : (
                  <>
                    {!state.agentReachable && (
                      <div className="hp-agent-offline-note">
                        <span className="hp-agent-offline-dot" />
                        Agent offline — enter hardware manually
                      </div>
                    )}
                    {state.overrideDetected && (
                      <div style={{ marginBottom: 4 }}>
                        <button
                          className="hp-hw-override-btn"
                          onClick={() => dispatch({ type: 'TOGGLE_OVERRIDE' })}
                        >
                          ← Use detected hardware
                        </button>
                      </div>
                    )}
                    <div className="hp-manual-grid">
                      <div className="hp-field">
                        <div className="hp-field-label">GPU VRAM (GB)</div>
                        <input
                          type="number"
                          className="hp-number-input"
                          min={1}
                          max={192}
                          step={1}
                          value={state.manualVram}
                          onChange={e =>
                            dispatch({ type: 'SET_MANUAL_VRAM', gb: parseFloat(e.target.value) || 12 })
                          }
                        />
                      </div>
                      <div className="hp-field">
                        <div className="hp-field-label">System RAM (GB)</div>
                        <input
                          type="number"
                          className="hp-number-input"
                          min={1}
                          max={512}
                          step={1}
                          value={state.manualRam}
                          onChange={e =>
                            dispatch({ type: 'SET_MANUAL_RAM', gb: parseFloat(e.target.value) || 32 })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ── Section 2: Calculator ──────────────────────────────────────── */}
          <section>
            <div className="hp-section-label">02 — CALCULATE</div>
            <div className="hp-calc-row">

              {/* Left: controls */}
              <div className="hp-controls-col">

                {/* Quant selector */}
                <div className="hp-field">
                  <div className="hp-field-label">Quantization</div>
                  <div className="hp-quant-row">
                    {QUANT_KEYS.map(q => (
                      <button
                        key={q}
                        className={`hp-quant-btn${state.quant === q ? ' active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_QUANT', quant: q })}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="hp-slider-group">
                  {/* Context length */}
                  <div className="hp-slider-field">
                    <div className="hp-slider-header">
                      <span className="hp-slider-name">Context Length</span>
                      <span className="hp-slider-value">{formatContext(state.contextLen)}</span>
                    </div>
                    <input
                      type="range"
                      className="hp-slider"
                      min={0}
                      max={CONTEXT_MARKS.length - 1}
                      step={1}
                      value={contextIndex}
                      onChange={e =>
                        dispatch({ type: 'SET_CONTEXT', len: CONTEXT_MARKS[parseInt(e.target.value)] })
                      }
                    />
                  </div>

                  {/* Batch size */}
                  <div className="hp-slider-field">
                    <div className="hp-slider-header">
                      <span className="hp-slider-name">Batch Size</span>
                      <span className="hp-slider-value">{state.batchSize}</span>
                    </div>
                    <input
                      type="range"
                      className="hp-slider"
                      min={1}
                      max={32}
                      step={1}
                      value={state.batchSize}
                      onChange={e =>
                        dispatch({ type: 'SET_BATCH', size: parseInt(e.target.value) })
                      }
                    />
                  </div>

                  {/* GPU layers — llama.cpp only */}
                  {state.framework === 'llama.cpp' && (
                    <div className="hp-slider-field">
                      <div className="hp-slider-header">
                        <span className="hp-slider-name">GPU Layers</span>
                        <span className="hp-slider-value">{state.gpuLayers}%</span>
                      </div>
                      <input
                        type="range"
                        className="hp-slider"
                        min={0}
                        max={100}
                        step={5}
                        value={state.gpuLayers}
                        onChange={e =>
                          dispatch({ type: 'SET_GPU_LAYERS', pct: parseInt(e.target.value) })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right: live results */}
              <div className="hp-results-col">

                {/* Verdict */}
                <motion.div
                  key={result.verdict}
                  className={`hp-verdict ${result.verdict}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {verdictLabel[result.verdict]}
                </motion.div>

                {/* VRAM bar */}
                <VRAMBar result={result} availableVramGb={gpuVramGb} />

                {/* Stats grid */}
                <div className="hp-stats-grid">
                  <div className="hp-stat-card">
                    <div className="hp-stat-name">RAM Required</div>
                    <div className="hp-stat-value ram">{result.ramRequiredGb.toFixed(1)} GB</div>
                  </div>
                  <div className="hp-stat-card">
                    <div className="hp-stat-name">TPS Estimate</div>
                    <div className="hp-stat-value tps">~{result.tps} t/s</div>
                  </div>
                  <div className="hp-stat-card">
                    <div className="hp-stat-name">Power Draw</div>
                    <div className="hp-stat-value power">~{result.powerW} W</div>
                  </div>
                  <div className="hp-stat-card">
                    <div className="hp-stat-name">Load Time</div>
                    <div className="hp-stat-value load">~{result.loadTimeSec}s</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 3: Quant comparison chart ─────────────────────────── */}
          <section>
            <div className="hp-section-label">03 — QUANTIZATION COMPARISON</div>
            <div className="hp-chart-panel">
              <div className="hp-chart-header">
                <div className="hp-chart-header-cell">QUANT</div>
                <div className="hp-chart-header-cell">VRAM</div>
                <div className="hp-chart-header-cell" style={{ textAlign: 'right' }}>GB</div>
                <div className="hp-chart-header-cell">QUALITY</div>
                <div className="hp-chart-header-cell" style={{ textAlign: 'right' }}>%</div>
                <div className="hp-chart-header-cell" style={{ textAlign: 'center' }}>STATUS</div>
              </div>

              {quantRows.map((row, i) => {
                const vramBarPct    = maxQuantVram > 0 ? (row.vramGb / maxQuantVram) * 100 : 0
                const qualBarPct    = row.qualityPct
                const isSelected    = row.quant === state.quant

                return (
                  <motion.div
                    key={row.quant}
                    className={`hp-chart-row${isSelected ? ' selected' : ''}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                  >
                    <div className="hp-chart-quant-name">{row.quant}</div>

                    <div className="hp-chart-bar-track">
                      <motion.div
                        className="hp-chart-bar-fill vram-bar"
                        initial={{ width: 0 }}
                        animate={{ width: `${vramBarPct}%` }}
                        transition={{ delay: i * 0.05 + 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>

                    <div className="hp-chart-gb-label">{row.vramGb.toFixed(1)}</div>

                    <div className="hp-chart-bar-track">
                      <motion.div
                        className="hp-chart-bar-fill qual-bar"
                        initial={{ width: 0 }}
                        animate={{ width: `${qualBarPct}%` }}
                        transition={{ delay: i * 0.05 + 0.15, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>

                    <div className="hp-chart-pct-label">{row.qualityPct}</div>

                    {row.exceedsAvailable ? (
                      <div className="hp-chart-exceeds-tag">EXCEEDS</div>
                    ) : (
                      <div className="hp-chart-ok-spacer" />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </section>

          {/* ── Section 4: Model fit grid ──────────────────────────────────── */}
          <section>
            <div className="hp-section-label">04 — MODEL FIT GRID</div>
            <div className="hp-grid-panel">
              <table className="hp-fit-table">
                <thead>
                  <tr>
                    <th>QUANT</th>
                    {GRID_GPUS.map(g => (
                      <th key={g.name}>
                        {g.name}
                        <span className="hp-gpu-vram-sub">{g.vram} GB</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {QUANT_KEYS.map((q, qi) => (
                    <motion.tr
                      key={q}
                      className={q === state.quant ? 'selected-quant-row' : ''}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: qi * 0.04, duration: 0.2 }}
                    >
                      <td>{q}</td>
                      {GRID_GPUS.map((g, gi) => {
                        const fit = gridFitResult(paramsBillions, q, g.vram)
                        const symbol = fit === 'fit' ? '✓' : fit === 'tight' ? '⚠' : '✗'
                        return (
                          <td key={g.name}>
                            <motion.div
                              className={`hp-fit-cell ${fit}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: qi * 0.04 + gi * 0.02, duration: 0.18 }}
                            >
                              {symbol}
                            </motion.div>
                          </td>
                        )
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 5: Buy vs Rent (shown only when verdict = over) ───── */}
          <AnimatePresence>
            {showCloud && (
              <motion.section
                key="cloud"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="hp-section-label">05 — CLOUD ALTERNATIVES</div>
                <div className="hp-cloud-panel">
                  <div className="hp-cloud-title">CLOUD ALTERNATIVES</div>
                  <div className="hp-cloud-subtitle">
                    Since this model exceeds your local VRAM, here are cloud options:
                  </div>
                  <table className="hp-cloud-table">
                    <thead>
                      <tr>
                        <th>PROVIDER</th>
                        <th>GPU</th>
                        <th>VRAM</th>
                        <th>$/HR</th>
                        <th>FITS MODEL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CLOUD_OPTIONS.map((opt, i) => {
                        const fits = cloudFits(paramsBillions, state.quant, opt.vram)
                        return (
                          <motion.tr
                            key={`${opt.provider}-${opt.gpu}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.2 }}
                          >
                            <td className="provider">{opt.provider}</td>
                            <td className="gpu-name">{opt.gpu}</td>
                            <td className="vram-col">{opt.vram} GB</td>
                            <td className="price-col">${opt.price_hr.toFixed(2)}</td>
                            <td>
                              {fits
                                ? <span className="hp-cloud-fits-yes">✓</span>
                                : <span className="hp-cloud-fits-no">✗</span>
                              }
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* ── Section 6: Explainer collapsible ──────────────────────────── */}
          <section>
            <div className="hp-explainer-wrap">
              <button
                className="hp-explainer-toggle"
                onClick={() => dispatch({ type: 'TOGGLE_EXPLAINER' })}
              >
                <span className="hp-explainer-toggle-label">
                  <span className="hp-explainer-toggle-icon">▸</span>
                  HOW DOES VRAM WORK?
                </span>
                <ChevronDown
                  size={16}
                  className={`hp-explainer-toggle-icon${state.explainerOpen ? ' open' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {state.explainerOpen && (
                  <motion.div
                    className="hp-explainer-body"
                    key="explainer-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <div className="hp-explainer-inner">
                      <HardwarePlannerExplainer />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

        </div>
      </div>
    </MotionConfig>
  )
}

export default HardwarePlannerPage
