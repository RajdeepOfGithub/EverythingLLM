/**
 * HuggingFace Hub live model registry.
 *
 * Fetches GGUF models from the four trusted namespaces,
 * filters by minimum thresholds, and exposes actual file sizes
 * per quantization level extracted from the `siblings` list.
 *
 * Cache: module-level, 10-minute TTL (timestamp check — no setTimeout).
 * Errors: logged as warnings, never thrown — callers receive an empty array.
 */

export interface HFModel {
  modelId: string
  name: string          // human-readable: last segment of modelId
  downloads: number
  lastModified: string  // ISO 8601
  quantSizes: Record<string, number>  // quant label → bytes  e.g. { 'Q4_K_M': 8123456789 }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HF_NAMESPACES = ['bartowski', 'unsloth', 'LoneStriker', 'MaziyarPanahi'] as const

const HF_API_BASE = 'https://huggingface.co/api'

/** Minimum download count to include a model */
const MIN_DOWNLOADS = 500

/** Maximum age in milliseconds — 12 months */
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

/** TTL for the module-level cache — 10 minutes */
const CACHE_TTL_MS = 10 * 60 * 1000

// ---------------------------------------------------------------------------
// HF API response shapes (internal — not exported)
// ---------------------------------------------------------------------------

interface HFSibling {
  rfilename: string
  size?: number
}

interface HFApiModel {
  modelId?: string
  id?: string
  downloads?: number
  lastModified?: string
  cardData?: unknown      // presence (non-null) means model card exists
  siblings?: HFSibling[]
}

// ---------------------------------------------------------------------------
// Quant label extraction
// ---------------------------------------------------------------------------

/**
 * Known quantization labels in lowercase — used to match GGUF filenames.
 * Sorted longest-first so that more specific labels (q4_k_m) match before
 * shorter prefixes (q4).
 */
const KNOWN_QUANTS = [
  'q2_k_l', 'q2_k_m', 'q2_k',
  'q3_k_xl', 'q3_k_l', 'q3_k_m', 'q3_k_s', 'q3_k',
  'q4_k_m', 'q4_k_s', 'q4_k_l', 'q4_k', 'q4_0', 'q4_1',
  'q5_k_m', 'q5_k_s', 'q5_k', 'q5_0', 'q5_1',
  'q6_k',
  'q8_0',
  'f16', 'f32',
  'iq1_s', 'iq1_m',
  'iq2_xs', 'iq2_xxs', 'iq2_s', 'iq2_m',
  'iq3_xs', 'iq3_s', 'iq3_m',
  'iq4_xs', 'iq4_nl',
].sort((a, b) => b.length - a.length)

/**
 * Extract quant label from a GGUF filename.
 * Returns null for non-GGUF files or unrecognised patterns.
 *
 * Examples:
 *   "Llama-3.2-1B-Q4_K_M.gguf"       → "Q4_K_M"
 *   "model-00001-Q8_0-00001-of-00002.gguf" → "Q8_0"
 */
function extractQuant(filename: string): string | null {
  if (!filename.toLowerCase().endsWith('.gguf')) return null
  const lower = filename.toLowerCase()
  for (const label of KNOWN_QUANTS) {
    // Must be preceded by a separator (-, _, .) and followed by one or end/dot
    const pattern = new RegExp(`[-_.]${label.replace(/_/g, '[_-]')}(?:[-_.]|$)`)
    if (pattern.test(lower)) {
      return label.toUpperCase().replace(/-/g, '_')
    }
  }
  return null
}

/**
 * Build quantSizes map from a siblings list.
 * When multiple shards exist for the same quant we sum their sizes.
 */
function buildQuantSizes(siblings: HFSibling[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const sibling of siblings) {
    const quant = extractQuant(sibling.rfilename)
    if (quant === null) continue
    const bytes = sibling.size ?? 0
    result[quant] = (result[quant] ?? 0) + bytes
  }
  return result
}

// ---------------------------------------------------------------------------
// Filtering helpers
// ---------------------------------------------------------------------------

function hasModelCard(model: HFApiModel): boolean {
  return model.cardData !== null && model.cardData !== undefined
}

function isRecentEnough(model: HFApiModel): boolean {
  if (!model.lastModified) return false
  const age = Date.now() - new Date(model.lastModified).getTime()
  return age <= MAX_AGE_MS
}

function hasEnoughDownloads(model: HFApiModel): boolean {
  return (model.downloads ?? 0) > MIN_DOWNLOADS
}

function hasGgufFiles(siblings: HFSibling[]): boolean {
  return siblings.some(s => s.rfilename.toLowerCase().endsWith('.gguf'))
}

// ---------------------------------------------------------------------------
// Single-namespace fetch
// ---------------------------------------------------------------------------

async function fetchNamespace(namespace: string): Promise<HFModel[]> {
  const url =
    `${HF_API_BASE}/models` +
    `?author=${encodeURIComponent(namespace)}` +
    `&limit=50` +
    `&sort=downloads` +
    `&direction=-1` +
    `&full=true`   // includes siblings + cardData

  const resp = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!resp.ok) {
    throw new Error(`HF API ${resp.status} for namespace ${namespace}`)
  }

  const raw: HFApiModel[] = await resp.json()

  const models: HFModel[] = []
  for (const m of raw) {
    if (!hasEnoughDownloads(m)) continue
    if (!hasModelCard(m)) continue
    if (!isRecentEnough(m)) continue

    const siblings: HFSibling[] = m.siblings ?? []
    if (!hasGgufFiles(siblings)) continue

    const id = m.modelId ?? m.id ?? ''
    if (!id) continue

    const quantSizes = buildQuantSizes(siblings)
    // Only include if we found at least one recognisable quant
    if (Object.keys(quantSizes).length === 0) continue

    models.push({
      modelId: id,
      name: id.split('/').pop() ?? id,
      downloads: m.downloads ?? 0,
      lastModified: m.lastModified ?? '',
      quantSizes,
    })
  }

  return models
}

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

let _cacheTimestamp = 0
let _cachedModels: HFModel[] = []

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch live GGUF models from all four trusted HF namespaces.
 *
 * Results are cached for 10 minutes.  On any network/parse error the
 * function logs a warning and returns an empty array — callers must handle
 * the empty-array case by falling back to the static registry.
 */
export async function fetchHFModels(): Promise<HFModel[]> {
  const now = Date.now()
  if (_cachedModels.length > 0 && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _cachedModels
  }

  try {
    const perNamespace = await Promise.allSettled(
      HF_NAMESPACES.map(ns => fetchNamespace(ns))
    )

    const all: HFModel[] = []
    for (const result of perNamespace) {
      if (result.status === 'fulfilled') {
        all.push(...result.value)
      } else {
        console.warn('[hfRegistry] namespace fetch failed:', result.reason)
      }
    }

    // De-duplicate by modelId (same model can appear under multiple namespaces if
    // a namespace owner uploads forks — keep the entry with more downloads)
    const deduped = new Map<string, HFModel>()
    for (const m of all) {
      const existing = deduped.get(m.modelId)
      if (!existing || m.downloads > existing.downloads) {
        deduped.set(m.modelId, m)
      }
    }

    _cacheTimestamp = now
    _cachedModels = Array.from(deduped.values())
    return _cachedModels
  } catch (err) {
    console.warn('[hfRegistry] fetchHFModels failed:', err)
    return []
  }
}

/**
 * Invalidate the module-level cache (useful for testing).
 */
export function invalidateHFCache(): void {
  _cacheTimestamp = 0
  _cachedModels = []
}
