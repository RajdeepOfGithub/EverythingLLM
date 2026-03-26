/**
 * EverythingLLM — Backend API Contract
 * Source of truth for all Frontend ↔ Backend communication.
 *
 * Base URL: https://api.everythingllm.com  (prod)
 *           http://localhost:8000           (local dev)
 * Stored in env var: VITE_API_BASE_URL
 *
 * Auth: All protected endpoints require Bearer token in Authorization header.
 * Token is obtained from AWS Cognito after login.
 *
 * RULES:
 * - Backend owns this file. FastAPI routes must match these shapes exactly.
 * - Frontend has read-only access. Never modify types here — only consume them.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// POST /auth/validate
export interface AuthValidateRequest {
  token: string;
}
export interface AuthValidateResponse {
  valid: boolean;
  user_id: string;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

// GET /user/profile
export interface UserProfile {
  user_id: string;
  email: string;
  created_at: string;                                 // ISO 8601
  hardware_profile: HardwareProfile | null;
}

// POST /user/hardware-profile
export interface HardwareProfile {
  os: string;
  ram_total_gb: number;
  gpu_name: string | null;
  gpu_backend: string | null;
  vram_total_gb: number | null;
}
export interface SaveHardwareProfileResponse {
  saved: boolean;
}

// ---------------------------------------------------------------------------
// Model Recommender — Sliders + Stack
// ---------------------------------------------------------------------------

// Slider preferences per task (each value is 1–5)
export interface SliderPreferences {
  quality: number;       // Model output accuracy (HumanEval / MMLU / MT-Bench score weight)
  speed: number;         // Tokens/sec — computed dynamically against user's hardware
  fit: number;           // How well the model fits in available VRAM
  context: number;       // Max context length supported by the model
}

export type UseCase =
  | "coding"
  | "documentation"
  | "chat"
  | "reasoning"
  | "explanation";

// A single task entry in the multi-role model stack
export interface ModelStackEntry {
  use_case: UseCase;
  hf_model_id: string;                               // Best pick for this task
  model_name: string;                                // Human-readable name
  sliders: SliderPreferences;                        // User's slider config for this task
  vram_required_gb: number;                          // VRAM this model needs at chosen quant
  can_run_simultaneously: boolean;                   // Whether all stack models fit in VRAM together
}

// ---------------------------------------------------------------------------
// Models (saved selections)
// ---------------------------------------------------------------------------

// POST /models/save — saves the full multi-role model stack
export interface SaveModelStackRequest {
  stack: ModelStackEntry[];
  total_vram_required_gb: number;
  simultaneous_fit: boolean;                         // true = all models fit in VRAM at once
}
export interface SaveModelStackResponse {
  saved: boolean;
  stack_id: string;
}

// GET /models/saved — returns the user's saved stack
export interface SavedModelStack {
  stack_id: string;
  stack: ModelStackEntry[];
  simultaneous_fit: boolean;
  saved_at: string;                                  // ISO 8601
}
export type SavedModelStackResponse = SavedModelStack | null;

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

// POST /benchmarks/save
export interface SaveBenchmarkRequest {
  model_id: string;
  config: {
    threads: number;
    parallel: number;
    context_size: number;
    batch_size: number;
    gpu_layers: number;
  };
  results: {
    peak_eval_tps: number;
    peak_prompt_tps: number;
    best_threads: number;
    best_parallel: number;
    sweep_data: object;                               // Full sweep as JSON string in DB
  };
  is_speculative: boolean;
  draft_model_id: string | null;
}
export interface SaveBenchmarkResponse {
  id: string;
  share_url: string;
}

// GET /benchmarks/history
export interface BenchmarkSummary {
  id: string;
  model_id: string;
  peak_eval_tps: number;
  created_at: string;
  share_url: string;
}
export type BenchmarkHistoryResponse = BenchmarkSummary[];

// GET /benchmarks/:id
export interface BenchmarkDetail extends BenchmarkSummary {
  config: SaveBenchmarkRequest["config"];
  results: SaveBenchmarkRequest["results"];
  is_speculative: boolean;
  draft_model_id: string | null;
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

// GET /community/leaderboard
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  model_id: string;
  peak_eval_tps: number;
  gpu_name: string | null;
  share_url: string;
}
export type LeaderboardResponse = LeaderboardEntry[];

// ---------------------------------------------------------------------------
// Speculative Decoding
// ---------------------------------------------------------------------------

// GET /speculative/recommendations?target_model=...&vram_gb=...
export interface DraftModelCandidate {
  hf_model_id: string;
  name: string;
  estimated_speedup: number;                          // e.g. 1.8
  community_acceptance_rate: number | null;           // 0.0 – 1.0, null if no data
  vram_required_gb: number;
}
export type SpeculativeRecommendationsResponse = DraftModelCandidate[];
