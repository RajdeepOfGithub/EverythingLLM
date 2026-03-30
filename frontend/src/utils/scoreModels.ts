import { SliderPreferences } from '../../../shared/contracts/backend_api'
import { HardwareResponse } from '../../../shared/contracts/local_agent_api'
import { ModelResult } from '../store/recommenderStore'

interface PoolEntry {
  hf_model_id: string
  model_name: string
  params: string
  quant: string
  vram_required_gb: number
  base_quality: number
  base_speed: number
}

export const MODEL_POOL: PoolEntry[] = [
  {
    hf_model_id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    model_name: 'Qwen 2.5 Coder 32B',
    params: '32B',
    quant: 'Q4_K_M',
    vram_required_gb: 20,
    base_quality: 94,
    base_speed: 18,
  },
  {
    hf_model_id: 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct',
    model_name: 'DeepSeek Coder V2 Lite',
    params: '16B',
    quant: 'Q4_K_M',
    vram_required_gb: 10,
    base_quality: 82,
    base_speed: 35,
  },
  {
    hf_model_id: 'meta-llama/Llama-3.3-70B-Instruct',
    model_name: 'Llama 3.3 70B',
    params: '70B',
    quant: 'Q4_K_M',
    vram_required_gb: 43,
    base_quality: 96,
    base_speed: 8,
  },
  {
    hf_model_id: 'mistralai/Mistral-Small-3.1-24B-Instruct-2503',
    model_name: 'Mistral Small 3.1 24B',
    params: '24B',
    quant: 'Q4_K_M',
    vram_required_gb: 14,
    base_quality: 84,
    base_speed: 26,
  },
  {
    hf_model_id: 'google/gemma-3-27b-it',
    model_name: 'Gemma 3 27B',
    params: '27B',
    quant: 'Q4_K_M',
    vram_required_gb: 17,
    base_quality: 88,
    base_speed: 20,
  },
  {
    hf_model_id: 'Qwen/Qwen2.5-14B-Instruct',
    model_name: 'Qwen 2.5 14B',
    params: '14B',
    quant: 'Q4_K_M',
    vram_required_gb: 9,
    base_quality: 80,
    base_speed: 38,
  },
]

export function scoreModels(
  sliders: SliderPreferences,
  hardware: HardwareResponse | null
): ModelResult[] {
  const totalWeight = sliders.quality + sliders.speed + sliders.fit + sliders.context
  const qW = sliders.quality / totalWeight
  const sW = sliders.speed / totalWeight
  const fW = sliders.fit / totalWeight
  const cW = sliders.context / totalWeight

  const availableVram = hardware?.gpu?.vram_available_gb ?? null

  const scored = MODEL_POOL.map((m) => {
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
    const contextScore = 80 // constant — context window data not in mock pool

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
