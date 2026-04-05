/**
 * Hardware Planner — pure calculation utilities.
 * All functions are deterministic with no React/DOM dependencies.
 */

export type QuantKey = 'Q2_K' | 'Q4_K_M' | 'Q5_K_M' | 'Q8_0' | 'F16'

export const QUANT_KEYS: QuantKey[] = ['Q2_K', 'Q4_K_M', 'Q5_K_M', 'Q8_0', 'F16']

// Bytes per parameter by quantization
const BYTES_PER_PARAM: Record<QuantKey, number> = {
  Q2_K:   0.3125, // ~2.5 bits
  Q4_K_M: 0.5,    // ~4 bits
  Q5_K_M: 0.625,  // ~5 bits
  Q8_0:   1.0,    // 8 bits
  F16:    2.0,    // 16 bits
}

// Approximate quality retention %
export const QUALITY_RETENTION: Record<QuantKey, number> = {
  Q2_K:   65,
  Q4_K_M: 90,
  Q5_K_M: 94,
  Q8_0:   98,
  F16:   100,
}

/** Model weights VRAM in GB */
export function modelWeightsVram(paramsBillions: number, quant: QuantKey): number {
  return (paramsBillions * 1e9 * BYTES_PER_PARAM[quant]) / 1e9
}

/**
 * KV cache VRAM in GB.
 * Empirical: ~0.5 MB per billion params per 1 K context tokens per batch item.
 */
export function kvCacheVram(
  paramsBillions: number,
  contextLen: number,
  batchSize: number,
): number {
  return (paramsBillions * 0.5 * (contextLen / 1024) * batchSize) / 1024
}

/** Runtime overhead ≈ 10 % of model weights */
export function runtimeOverhead(modelWeightsGb: number): number {
  return modelWeightsGb * 0.1
}

/**
 * Very rough TPS estimate.
 * Higher VRAM headroom and lower quant → faster.
 */
export function estimateTps(
  paramsBillions: number,
  quant: QuantKey,
  gpuVramGb: number,
): number {
  const baseSpeed = Math.max(1, (gpuVramGb / paramsBillions) * 8)
  const quantMultiplier: Record<QuantKey, number> = {
    Q2_K:   1.4,
    Q4_K_M: 1.0,
    Q5_K_M: 0.9,
    Q8_0:   0.75,
    F16:    0.5,
  }
  return Math.round(baseSpeed * quantMultiplier[quant])
}

/** Power draw estimate in watts */
export function estimatePowerDraw(gpuVramGb: number, gpuLayers: number): number {
  return Math.round(gpuVramGb * 8 * (gpuLayers / 100) + 20)
}

/**
 * System RAM required.
 * If not all layers are on GPU, the remainder loads into RAM.
 */
export function estimateRamRequired(modelWeightsGb: number, gpuLayers: number): number {
  const cpuFraction = 1 - gpuLayers / 100
  return modelWeightsGb * cpuFraction + 2
}

/** Load time estimate in seconds (~0.8 s/GB from NVMe) */
export function estimateLoadTime(modelWeightsGb: number): number {
  return Math.round(modelWeightsGb * 0.8)
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface HWCalcInput {
  paramsBillions: number
  quant: QuantKey
  contextLen: number
  batchSize: number
  gpuLayers: number   // 0–100 (percentage)
  gpuVramGb: number
  ramGb: number
}

export interface HWCalcResult {
  modelWeightsGb: number
  kvCacheGb: number
  overheadGb: number
  totalVramGb: number
  tps: number
  powerW: number
  ramRequiredGb: number
  loadTimeSec: number
  /** 'fit' | 'tight' | 'over' */
  verdict: 'fit' | 'tight' | 'over'
  vramUsedFraction: number  // 0–1+ (>1 means overflow)
}

export function calculateHardware(input: HWCalcInput): HWCalcResult {
  const { paramsBillions, quant, contextLen, batchSize, gpuLayers, gpuVramGb } = input

  const modelWeightsGb = modelWeightsVram(paramsBillions, quant)
  const kvCacheGb      = kvCacheVram(paramsBillions, contextLen, batchSize)
  const overheadGb     = runtimeOverhead(modelWeightsGb)
  const totalVramGb    = modelWeightsGb + kvCacheGb + overheadGb

  const vramUsedFraction = gpuVramGb > 0 ? totalVramGb / gpuVramGb : Infinity

  let verdict: 'fit' | 'tight' | 'over'
  if (vramUsedFraction > 1) {
    verdict = 'over'
  } else if (vramUsedFraction >= 0.9) {
    verdict = 'tight'
  } else {
    verdict = 'fit'
  }

  return {
    modelWeightsGb,
    kvCacheGb,
    overheadGb,
    totalVramGb,
    tps:           estimateTps(paramsBillions, quant, gpuVramGb),
    powerW:        estimatePowerDraw(gpuVramGb, gpuLayers),
    ramRequiredGb: estimateRamRequired(modelWeightsGb, gpuLayers),
    loadTimeSec:   estimateLoadTime(modelWeightsGb),
    verdict,
    vramUsedFraction,
  }
}

// ---------------------------------------------------------------------------
// Quantization comparison (all quants for current model)
// ---------------------------------------------------------------------------

export interface QuantRow {
  quant: QuantKey
  vramGb: number
  qualityPct: number
  exceedsAvailable: boolean
}

export function quantComparison(
  paramsBillions: number,
  contextLen: number,
  batchSize: number,
  availableVramGb: number,
): QuantRow[] {
  return QUANT_KEYS.map((q) => {
    const weights  = modelWeightsVram(paramsBillions, q)
    const kv       = kvCacheVram(paramsBillions, contextLen, batchSize)
    const overhead = runtimeOverhead(weights)
    const total    = weights + kv + overhead
    return {
      quant: q,
      vramGb: parseFloat(total.toFixed(1)),
      qualityPct: QUALITY_RETENTION[q],
      exceedsAvailable: total > availableVramGb,
    }
  })
}

// ---------------------------------------------------------------------------
// Model fit grid
// ---------------------------------------------------------------------------

export const GRID_GPUS: { name: string; vram: number }[] = [
  { name: 'RTX 3060',  vram: 12 },
  { name: 'RTX 4070',  vram: 12 },
  { name: 'RTX 4090',  vram: 24 },
  { name: 'A6000',     vram: 48 },
  { name: 'A100',      vram: 80 },
  { name: 'H100',      vram: 80 },
]

export type FitResult = 'fit' | 'tight' | 'over'

export function gridFitResult(
  paramsBillions: number,
  quant: QuantKey,
  gpuVram: number,
): FitResult {
  // Minimum viable use: 1 K context, batch 1
  const weights  = modelWeightsVram(paramsBillions, quant)
  const kv       = kvCacheVram(paramsBillions, 1024, 1)
  const overhead = runtimeOverhead(weights)
  const total    = weights + kv + overhead
  const fraction = total / gpuVram
  if (fraction > 1)    return 'over'
  if (fraction >= 0.9) return 'tight'
  return 'fit'
}

// ---------------------------------------------------------------------------
// Cloud options (buy vs rent)
// ---------------------------------------------------------------------------

export interface CloudOption {
  provider: string
  gpu: string
  vram: number
  price_hr: number
}

export const CLOUD_OPTIONS: CloudOption[] = [
  { provider: 'RunPod',    gpu: 'RTX 4090',  vram: 24, price_hr: 0.74 },
  { provider: 'RunPod',    gpu: 'A100 80GB', vram: 80, price_hr: 1.89 },
  { provider: 'Lambda',    gpu: 'A100 80GB', vram: 80, price_hr: 1.99 },
  { provider: 'vast.ai',   gpu: 'RTX 4090',  vram: 24, price_hr: 0.35 },
  { provider: 'vast.ai',   gpu: 'A100 80GB', vram: 80, price_hr: 1.20 },
  { provider: 'CoreWeave', gpu: 'H100 80GB', vram: 80, price_hr: 2.79 },
]

export function cloudFits(
  paramsBillions: number,
  quant: QuantKey,
  cloudVram: number,
): boolean {
  const weights  = modelWeightsVram(paramsBillions, quant)
  const overhead = runtimeOverhead(weights)
  return weights + overhead <= cloudVram
}
