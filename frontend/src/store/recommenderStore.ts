import { create } from 'zustand'
import { UseCase, SliderPreferences } from '../../../shared/contracts/backend_api'
import { HardwareResponse } from '../../../shared/contracts/local_agent_api'

export interface ModelResult {
  hf_model_id: string
  model_name: string
  params: string
  quant: string
  vram_required_gb: number
  tps_estimate: number
  score: number         // 0-100 composite score
  is_best_pick: boolean
}

export interface BenchmarkConfig {
  gpu_layers: number
  context_size: number
  batch_size: number
  threads: number
  model_hint: string   // display name for the recommendation hint
  quant: string
}

interface RecommenderState {
  step: 1 | 2 | 3
  direction: 1 | -1     // animation direction: 1=forward, -1=back
  useCase: UseCase | null
  sliders: SliderPreferences
  hardware: HardwareResponse | null
  results: ModelResult[]
  isLoading: boolean
  selectedModel: ModelResult | null   // best pick carried to other pages
  benchmarkConfig: BenchmarkConfig | null
  setStep: (step: 1 | 2 | 3, direction: 1 | -1) => void
  setUseCase: (uc: UseCase) => void
  setSlider: (key: keyof SliderPreferences, val: number) => void
  setHardware: (hw: HardwareResponse) => void
  setResults: (r: ModelResult[]) => void
  setLoading: (v: boolean) => void
  setSelectedModel: (m: ModelResult | null) => void
  setBenchmarkConfig: (cfg: BenchmarkConfig | null) => void
}

export const useRecommenderStore = create<RecommenderState>((set) => ({
  step: 1,
  direction: 1,
  useCase: null,
  sliders: { quality: 5, speed: 5, fit: 5, context: 5 },
  hardware: null,
  results: [],
  isLoading: false,
  selectedModel: null,
  benchmarkConfig: null,
  setStep: (step, direction) => set({ step, direction }),
  setUseCase: (useCase) => set({ useCase }),
  setSlider: (key, val) => set((s) => ({ sliders: { ...s.sliders, [key]: val } })),
  setHardware: (hardware) => set({ hardware }),
  setResults: (results) => set({ results }),
  setLoading: (isLoading) => set({ isLoading }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setBenchmarkConfig: (benchmarkConfig) => set({ benchmarkConfig }),
}))
