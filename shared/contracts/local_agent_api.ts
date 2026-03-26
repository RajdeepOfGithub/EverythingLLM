/**
 * EverythingLLM — Local Agent API Contract
 * Source of truth for all Frontend ↔ Local Agent communication.
 *
 * Base URL: http://localhost:7878/api/v1
 * WebSocket: ws://localhost:7878/ws/metrics/{session_id}
 *
 * RULES:
 * - Local Agent owns this file. Its Pydantic models must serialize into these exact shapes.
 * - Frontend has read-only access. Never modify types here — only consume them.
 */

// ---------------------------------------------------------------------------
// REST: Hardware Detection (feeds Module 2 — Hardware Planner)
// GET /api/v1/hardware
// ---------------------------------------------------------------------------

export interface HardwareResponse {
  system: {
    os: "darwin" | "windows" | "linux";
    ram_total_gb: number;
    ram_available_gb: number;
  };
  gpu: {
    detected: boolean;
    name: string | null;                              // e.g. "NVIDIA RTX 4090", "Apple M2 Max"
    backend: "metal" | "cuda" | "vulkan" | "cpu";
    vram_total_gb: number | null;
    vram_available_gb: number | null;
  };
}

// ---------------------------------------------------------------------------
// REST: Benchmark Lifecycle (feeds Module 3 — Throughput Benchmarker)
// ---------------------------------------------------------------------------

// POST /api/v1/benchmark/start
export interface BenchmarkStartRequest {
  model_path: string;                                 // Absolute path to .gguf file
  draft_model_path: string | null;                    // Module 4 only — null for standard benchmarks
  context_size: number;                               // e.g. 4096
  batch_size: number;                                 // e.g. 512
  threads: number;                                    // CPU threads
  gpu_layers: number;                                 // 99 = all layers to GPU
}

// Response: 202 Accepted
export interface BenchmarkStartResponse {
  session_id: string;                                 // e.g. "bench_abc123"
  status: "initializing";
}

// POST /api/v1/benchmark/stop
export interface BenchmarkStopRequest {
  session_id: string;
}

// GET /api/v1/benchmark/status
export interface BenchmarkStatusResponse {
  session_id: string;
  status: BenchmarkStatus;
}

// GET /api/v1/health
export interface HealthResponse {
  status: "ok";
}

// ---------------------------------------------------------------------------
// WebSocket: Live Telemetry
// ws://localhost:7878/ws/metrics/{session_id}
// ---------------------------------------------------------------------------

export type BenchmarkStatus =
  | "loading_model"
  | "warming_up"
  | "generating"
  | "completed"
  | "failed";

// Emitted when the engine changes state
export interface StatusUpdateEvent {
  event: "status_update";
  timestamp: number;                                  // Unix timestamp (seconds)
  payload: {
    status: BenchmarkStatus;
  };
}

// Emitted every ~500ms during generation — drives real-time heatmaps
export interface MetricTickEvent {
  event: "metric_tick";
  timestamp: number;
  payload: {
    prompt_eval_tps: number;                          // Prompt processing speed (tokens/sec)
    eval_tps: number;                                 // Generation speed (tokens/sec)
    vram_used_mb: number;
    cpu_usage_percent: number;
    temperature_c: number | null;                     // null if not supported by hardware
  };
}

// Module 4 only — emitted when running Speculative Decoding Advisor
export interface SpeculativeTickEvent {
  event: "speculative_tick";
  timestamp: number;
  payload: {
    draft_tokens_proposed: number;
    draft_tokens_accepted: number;
    acceptance_rate: number;                          // 0.0 – 1.0
    net_speedup_multiplier: number;                   // e.g. 1.8 = 80% faster
  };
}

export type AgentWebSocketEvent =
  | StatusUpdateEvent
  | MetricTickEvent
  | SpeculativeTickEvent;
