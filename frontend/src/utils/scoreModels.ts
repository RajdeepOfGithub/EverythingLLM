import { SliderPreferences } from '../../../shared/contracts/backend_api'
import { HardwareResponse } from '../../../shared/contracts/local_agent_api'
import { ModelResult } from '../store/recommenderStore'
import { fetchHFModels, HFModel } from './hfRegistry'
import { modelWeightsVram, type QuantKey } from './hwCalc'

// ---------------------------------------------------------------------------
// Static fallback pool
// ---------------------------------------------------------------------------

interface PoolEntry {
  hf_model_id: string
  model_name: string
  params: string
  quant: string
  vram_required_gb: number
  base_quality: number
  base_speed: number
}

// Static pool vram_required_gb values are base model weights only (no KV cache,
// no runtime overhead). Calculated via modelWeightsVram(params, 'Q4_K_M'):
//   params * 1e9 * 0.5 bytes/param / 1e9 = params * 0.5 GB
// The Hardware Planner adds KV cache + 10% overhead on top — this is intentional.
export const MODEL_POOL: PoolEntry[] = [
  {
    hf_model_id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    model_name: 'Qwen 2.5 Coder 32B',
    params: '32B',
    quant: 'Q4_K_M',
    vram_required_gb: 16.0, // modelWeightsVram(32, 'Q4_K_M')
    base_quality: 94,
    base_speed: 18,
  },
  {
    hf_model_id: 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct',
    model_name: 'DeepSeek Coder V2 Lite',
    params: '16B',
    quant: 'Q4_K_M',
    vram_required_gb: 8.0, // modelWeightsVram(16, 'Q4_K_M')
    base_quality: 82,
    base_speed: 35,
  },
  {
    hf_model_id: 'meta-llama/Llama-3.3-70B-Instruct',
    model_name: 'Llama 3.3 70B',
    params: '70B',
    quant: 'Q4_K_M',
    vram_required_gb: 35.0, // modelWeightsVram(70, 'Q4_K_M')
    base_quality: 96,
    base_speed: 8,
  },
  {
    hf_model_id: 'mistralai/Mistral-Small-3.1-24B-Instruct-2503',
    model_name: 'Mistral Small 3.1 24B',
    params: '24B',
    quant: 'Q4_K_M',
    vram_required_gb: 12.0, // modelWeightsVram(24, 'Q4_K_M')
    base_quality: 84,
    base_speed: 26,
  },
  {
    hf_model_id: 'google/gemma-3-27b-it',
    model_name: 'Gemma 3 27B',
    params: '27B',
    quant: 'Q4_K_M',
    vram_required_gb: 13.5, // modelWeightsVram(27, 'Q4_K_M')
    base_quality: 88,
    base_speed: 20,
  },
  {
    hf_model_id: 'Qwen/Qwen2.5-14B-Instruct',
    model_name: 'Qwen 2.5 14B',
    params: '14B',
    quant: 'Q4_K_M',
    vram_required_gb: 7.0, // modelWeightsVram(14, 'Q4_K_M')
    base_quality: 80,
    base_speed: 38,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse parameter count (in billions) from a string like "7B", "32B", "0.5B".
 * Returns null when parsing fails.
 */
function parseParamsBillions(paramStr: string): number | null {
  const match = paramStr.match(/^([\d.]+)[Bb]$/)
  if (!match) return null
  const n = parseFloat(match[1])
  return isNaN(n) ? null : n
}

/**
 * Try to extract a rough parameter count from an HF model name.
 * Looks for patterns like "-7B-", "-32b-", ".1B." etc. in the model ID.
 * Returns null when nothing can be inferred.
 */
function inferParamsBillions(modelId: string): number | null {
  const segment = modelId.split('/').pop() ?? modelId
  // Match: optional separator, digits (optionally with decimal), B or b, separator or end
  const match = segment.match(/[-_.]?([\d]+(?:\.[\d]+)?)[Bb](?:[-_.]|$)/)
  if (!match) return null
  const n = parseFloat(match[1])
  return isNaN(n) ? null : n
}

/**
 * Convert a file size in bytes to a base weight VRAM estimate in GB.
 * No overhead is added — this is the raw quantized model weight size.
 * The Hardware Planner adds KV cache + runtime overhead on top of this;
 * the Recommender shows only base weights because context window is not
 * known at scoring time.
 */
function bytesToVramGb(bytes: number): number {
  return parseFloat((bytes / 1e9).toFixed(2))
}

/**
 * Derive a rough quality score (0–100) from the quantization label.
 * Mirrors the QUALITY_RETENTION table in hwCalc.ts.
 */
const QUANT_QUALITY: Record<string, number> = {
  F32: 100,
  F16: 100,
  Q8_0: 98,
  Q6_K: 96,
  Q5_K_M: 94,
  Q5_K_S: 93,
  Q5_K: 93,
  Q5_1: 91,
  Q5_0: 90,
  Q4_K_M: 90,
  Q4_K_L: 90,
  Q4_K_S: 88,
  Q4_K: 88,
  Q4_1: 85,
  Q4_0: 84,
  Q3_K_XL: 80,
  Q3_K_L: 78,
  Q3_K_M: 76,
  Q3_K_S: 73,
  Q3_K: 73,
  Q2_K_M: 68,
  Q2_K_L: 68,
  Q2_K: 65,
}

function qualityFromQuant(quant: string): number {
  return QUANT_QUALITY[quant.toUpperCase()] ?? 75
}

/**
 * Derive a rough speed score (tokens/sec) from params and quant.
 * Matches rough figures used in the static pool.
 */
function speedFromParamsAndQuant(paramsBillions: number, quant: string): number {
  // Rough inverse relationship: smaller model + lighter quant = faster
  const base = Math.max(1, 200 / paramsBillions)
  const multipliers: Record<string, number> = {
    Q2_K: 1.8, Q3_K: 1.5, Q4_K_M: 1.0, Q4_0: 1.0,
    Q5_K_M: 0.85, Q5_0: 0.85,
    Q6_K: 0.7, Q8_0: 0.6,
    F16: 0.4, F32: 0.25,
  }
  const mul = multipliers[quant.toUpperCase()] ?? 1.0
  return Math.round(Math.min(base * mul, 80))
}

/**
 * Choose the "best" quant from an HFModel's quantSizes map.
 * Preference order: Q4_K_M > Q5_K_M > Q8_0 > Q4_0 > whatever is available.
 */
const PREFERRED_QUANTS = ['Q4_K_M', 'Q5_K_M', 'Q8_0', 'Q4_0', 'Q4_K_S', 'Q3_K_M']

function pickBestQuant(quantSizes: Record<string, number>): string | null {
  for (const q of PREFERRED_QUANTS) {
    if (quantSizes[q] !== undefined) return q
  }
  // Fallback: pick the first available
  const keys = Object.keys(quantSizes)
  return keys.length > 0 ? keys[0] : null
}

// ---------------------------------------------------------------------------
// Convert HFModel → PoolEntry
// ---------------------------------------------------------------------------

// QuantKey values that hwCalc.modelWeightsVram understands
const HW_CALC_QUANT_KEYS = new Set<string>(['Q2_K', 'Q4_K_M', 'Q5_K_M', 'Q8_0', 'F16'])

function hfModelToPoolEntry(model: HFModel): PoolEntry | null {
  const quant = pickBestQuant(model.quantSizes)
  if (!quant) return null

  const paramsBillions = inferParamsBillions(model.modelId) ?? 7  // default 7B when unknown
  const base_quality = qualityFromQuant(quant)
  const base_speed = speedFromParamsAndQuant(paramsBillions, quant)

  // Prefer modelWeightsVram (formula-based, matches Hardware Planner base weight)
  // when the quant is a known hwCalc key. Fall back to raw file bytes otherwise.
  let vram_required_gb: number
  if (HW_CALC_QUANT_KEYS.has(quant)) {
    vram_required_gb = parseFloat(
      modelWeightsVram(paramsBillions, quant as QuantKey).toFixed(2)
    )
  } else {
    const bytes = model.quantSizes[quant]
    vram_required_gb = bytesToVramGb(bytes)
  }

  // Derive human label like "7B" from inferred params
  const paramsLabel = `${paramsBillions}B`

  return {
    hf_model_id: model.modelId,
    model_name: model.name,
    params: paramsLabel,
    quant,
    vram_required_gb,
    base_quality,
    base_speed,
  }
}

// ---------------------------------------------------------------------------
// Context window scoring
// ---------------------------------------------------------------------------

/**
 * Derive an approximate context score (0–100) from a model's ID.
 * Checks for common context-size suffixes in the name.
 * Models that advertise larger context windows score higher.
 */
function contextScoreFromModelId(modelId: string): number {
  const id = modelId.toLowerCase()
  if (id.includes('128k')) return 95
  if (id.includes('32k'))  return 75
  if (id.includes('8k'))   return 55
  return 60 // unknown context — conservative default
}

// ---------------------------------------------------------------------------
// Core scoring logic (shared between sync and async paths)
// ---------------------------------------------------------------------------

function scorePool(
  pool: PoolEntry[],
  sliders: SliderPreferences,
  hardware: HardwareResponse | null,
): ModelResult[] {
  const totalWeight = sliders.quality + sliders.speed + sliders.fit + sliders.context
  const qW = sliders.quality / totalWeight
  const sW = sliders.speed / totalWeight
  const fW = sliders.fit / totalWeight
  const cW = sliders.context / totalWeight

  const availableVram = hardware?.gpu?.vram_available_gb ?? null

  const scored = pool.map((m) => {
    const qualityScore = m.base_quality
    const speedScore = (m.base_speed / 50) * 100
    let fitScore: number
    if (availableVram === null) {
      fitScore = 40
    } else if (m.vram_required_gb <= availableVram) {
      fitScore = 100
    } else {
      fitScore = 0
    }
    const contextScore = contextScoreFromModelId(m.hf_model_id)

    const composite =
      qW * qualityScore +
      sW * speedScore +
      fW * fitScore +
      cW * contextScore

    return {
      hf_model_id: m.hf_model_id,
      model_name: m.model_name,
      params: m.params,
      quant: m.quant,
      vram_required_gb: m.vram_required_gb,
      tps_estimate: m.base_speed,
      score: Math.round(composite),
      is_best_pick: false,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  if (scored.length > 0) {
    scored[0].is_best_pick = true
  }

  return scored
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score models against the user's slider preferences and detected hardware.
 *
 * This is the async version — it calls fetchHFModels() first and merges live
 * models into the pool.  Falls back to MODEL_POOL when the HF API is
 * unreachable or returns an empty result.
 *
 * For VRAM calculation, live models use actual file sizes from HF siblings;
 * static fallback models use the hard-coded vram_required_gb values.
 */
export async function scoreModels(
  sliders: SliderPreferences,
  hardware: HardwareResponse | null,
): Promise<ModelResult[]> {
  const liveModels = await fetchHFModels()

  let pool: PoolEntry[]

  if (liveModels.length === 0) {
    // HF API unreachable — use static fallback
    pool = MODEL_POOL
  } else {
    // Convert live models to pool entries; skip ones we can't parse
    const liveEntries: PoolEntry[] = []
    for (const hfModel of liveModels) {
      const entry = hfModelToPoolEntry(hfModel)
      if (entry) liveEntries.push(entry)
    }

    if (liveEntries.length === 0) {
      // All conversions failed — fall back to static
      pool = MODEL_POOL
    } else {
      // Merge: start with live entries; append any static entries whose
      // modelId isn't already covered by a live result.
      const liveIds = new Set(liveEntries.map(e => e.hf_model_id))
      const staticFallbacks = MODEL_POOL.filter(e => !liveIds.has(e.hf_model_id))
      pool = [...liveEntries, ...staticFallbacks]
    }
  }

  return scorePool(pool, sliders, hardware)
}

/**
 * Synchronous fallback scorer — uses only the static MODEL_POOL.
 * Used internally when a synchronous result is needed immediately.
 */
export function scoreModelsFallback(
  sliders: SliderPreferences,
  hardware: HardwareResponse | null,
): ModelResult[] {
  return scorePool(MODEL_POOL, sliders, hardware)
}

// Backwards-compat: keep parseParamsBillions export in case other modules use it
export { parseParamsBillions }
