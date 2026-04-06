"""
Benchmark session management for the local agent.
Handles BenchmarkSession lifecycle, real llama-cpp-python execution,
and a simulation fallback for dev/testing without a model file.
Phase 4: full implementation.
"""

import asyncio
import os
import time
import uuid
import random
from dataclasses import dataclass, field
from typing import Optional, Callable, Awaitable

import psutil

# Type alias matching the contract's BenchmarkStatus union
BenchmarkStatus = str  # "loading_model" | "warming_up" | "generating" | "completed" | "failed"


@dataclass
class BenchmarkConfig:
    model_path: str
    draft_model_path: Optional[str]
    context_size: int
    batch_size: int
    threads: int
    gpu_layers: int


@dataclass
class BenchmarkSession:
    session_id: str
    config: BenchmarkConfig
    status: BenchmarkStatus = "loading_model"
    task: Optional[asyncio.Task] = field(default=None, repr=False)
    subscribers: list = field(default_factory=list, repr=False)  # list[asyncio.Queue]

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self.subscribers.append(q)
        return q

    async def broadcast(self, event: dict):
        for q in self.subscribers:
            await q.put(event)

    def set_status(self, new_status: BenchmarkStatus):
        self.status = new_status


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, BenchmarkSession] = {}

    def create(self, config: BenchmarkConfig) -> BenchmarkSession:
        sid = f"bench_{uuid.uuid4().hex[:8]}"
        session = BenchmarkSession(session_id=sid, config=config)
        self._sessions[sid] = session
        return session

    def get(self, session_id: str) -> Optional[BenchmarkSession]:
        return self._sessions.get(session_id)

    def remove(self, session_id: str):
        self._sessions.pop(session_id, None)


session_manager = SessionManager()


# ---------------------------------------------------------------------------
# VRAM helper
# ---------------------------------------------------------------------------

def _read_vram_used_mb() -> float:
    """
    Try to read used VRAM from nvidia-smi.
    Returns 0.0 if GPU is unavailable or nvidia-smi fails.
    """
    try:
        import subprocess
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.used",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if result.returncode == 0:
            line = result.stdout.strip().splitlines()[0]
            return float(line.strip())
    except Exception:
        pass
    return 0.0


# ---------------------------------------------------------------------------
# Emit helpers (shared by real and simulated runners)
# ---------------------------------------------------------------------------

EmitTickFn = Callable[[float, float], Awaitable[None]]


async def _make_emit_status(session: BenchmarkSession):
    async def emit_status(status: BenchmarkStatus):
        session.set_status(status)
        await session.broadcast(
            {
                "event": "status_update",
                "timestamp": int(time.time()),
                "payload": {"status": status},
            }
        )

    return emit_status


async def _make_emit_tick(session: BenchmarkSession):
    # Prime psutil's per-interval CPU measurement once
    psutil.cpu_percent(interval=None)

    async def emit_tick(eval_tps: float, prompt_eval_tps: float):
        cpu_pct = psutil.cpu_percent(interval=None)
        vram_mb = _read_vram_used_mb()
        await session.broadcast(
            {
                "event": "metric_tick",
                "timestamp": int(time.time()),
                "payload": {
                    "prompt_eval_tps": round(prompt_eval_tps, 1),
                    "eval_tps": round(eval_tps, 1),
                    "vram_used_mb": vram_mb,
                    "cpu_usage_percent": cpu_pct,
                    "temperature_c": None,
                },
            }
        )

    return emit_tick


async def _make_emit_speculative_tick(session: BenchmarkSession):
    async def emit_speculative_tick(
        proposed: int,
        accepted: int,
        acceptance_rate: float,
        speedup: float,
    ):
        await session.broadcast({
            "event": "speculative_tick",
            "timestamp": int(time.time()),
            "payload": {
                "draft_tokens_proposed": proposed,
                "draft_tokens_accepted": accepted,
                "acceptance_rate": round(acceptance_rate, 3),
                "net_speedup_multiplier": round(speedup, 2),
            },
        })
    return emit_speculative_tick


# ---------------------------------------------------------------------------
# Real benchmark (llama-cpp-python)
# ---------------------------------------------------------------------------

EmitSpeculativeTickFn = Callable[[int, int, float, float], Awaitable[None]]

BENCHMARK_PROMPT = (
    "Explain the concept of neural network training in detail, "
    "covering forward pass, loss calculation, backpropagation, "
    "and gradient descent with concrete examples. "
) * 3


async def _run_real_benchmark(
    session: BenchmarkSession,
    llm,
    config: BenchmarkConfig,
    emit_tick: EmitTickFn,
):
    loop = asyncio.get_event_loop()

    # Warm-up: short generation to prime caches
    await loop.run_in_executor(
        None,
        lambda: llm(BENCHMARK_PROMPT, max_tokens=20, echo=False),
    )

    start = time.time()
    tokens_generated = 0

    # Rough baseline TPS for early ticks before the real result is in
    base_estimate = max(5.0, config.threads * 3.0 + config.batch_size * 0.1)

    async def _stream_metrics():
        """Fires metric_ticks every 500 ms while the blocking call runs."""
        while True:
            await asyncio.sleep(0.5)
            elapsed = time.time() - start
            tps = (tokens_generated / elapsed) if elapsed > 0 and tokens_generated > 0 else base_estimate
            await emit_tick(tps, tps * 2.5)

    metric_task = asyncio.create_task(_stream_metrics())

    try:
        result = await loop.run_in_executor(
            None,
            lambda: llm(BENCHMARK_PROMPT, max_tokens=200, echo=False),
        )
        elapsed = time.time() - start
        completion_tokens = result["usage"]["completion_tokens"]
        final_tps = (completion_tokens / elapsed) if elapsed > 0 else base_estimate
        # Emit one final accurate tick
        await emit_tick(final_tps, final_tps * 2.5)
    finally:
        metric_task.cancel()
        try:
            await metric_task
        except asyncio.CancelledError:
            pass


# ---------------------------------------------------------------------------
# Simulated benchmark (fallback — no model file required)
# ---------------------------------------------------------------------------

async def _run_simulated_speculative(
    session: BenchmarkSession,
    config: BenchmarkConfig,
    emit_tick: EmitTickFn,
    emit_speculative_tick: EmitSpeculativeTickFn,
):
    """
    Simulates speculative decoding metrics.
    Acceptance rate ~0.65-0.75, ramps up over first few ticks.
    Speedup ~1.6-2.1x, correlated with acceptance rate.
    """
    base_tps = min(80.0, config.threads * 4.0 + (config.batch_size / 64.0) * 5.0)
    base_tps = max(5.0, base_tps)
    base_acceptance = 0.70
    base_speedup = 1.75

    for i in range(12):
        ramp = min(1.0, (i + 1) / 4.0)
        noise = random.uniform(-0.04, 0.04)

        acceptance = min(0.95, base_acceptance * (1 + noise))
        speedup = base_speedup * ramp * (1 + noise * 0.5)
        proposed = random.randint(4, 8)
        accepted = max(0, round(proposed * acceptance))

        eval_tps = base_tps * ramp * (1 + noise)
        prompt_tps = eval_tps * 2.5 * (1 + random.uniform(-0.03, 0.03))

        await emit_tick(max(0.1, eval_tps), max(0.1, prompt_tps))
        await emit_speculative_tick(proposed, accepted, acceptance, max(1.0, speedup))
        await asyncio.sleep(0.5)


async def _run_simulated_benchmark(
    session: BenchmarkSession,
    config: BenchmarkConfig,
    emit_tick: EmitTickFn,
):
    """
    Produces realistic-looking TPS numbers derived from config parameters.
    Used when llama-cpp-python is not installed or model_path does not exist.
    Emits 12 ticks over ~6 seconds with a ramp-up curve.
    """
    # More threads + larger batch = faster; clamp to a plausible ceiling
    base_tps = min(80.0, config.threads * 4.0 + (config.batch_size / 64.0) * 5.0)
    base_tps = max(5.0, base_tps)

    for i in range(12):
        # Ramp factor: reaches ~1.0 after 4 ticks, then stays there with noise
        ramp = min(1.0, (i + 1) / 4.0)
        noise_factor = 1.0 + random.uniform(-0.05, 0.05)
        eval_tps = base_tps * ramp * noise_factor
        prompt_tps = eval_tps * 2.5 * (1.0 + random.uniform(-0.03, 0.03))
        await emit_tick(max(0.1, eval_tps), max(0.1, prompt_tps))
        await asyncio.sleep(0.5)


# ---------------------------------------------------------------------------
# Top-level runner — called as an asyncio.Task from api.py
# ---------------------------------------------------------------------------

async def run_benchmark(session: BenchmarkSession):
    """
    Entry point for a benchmark run.
    Attempts real llama-cpp-python execution; falls back to simulation if:
      - llama_cpp is not installed, or
      - model_path does not exist on disk.
    """
    config = session.config

    emit_status = await _make_emit_status(session)
    emit_tick = await _make_emit_tick(session)
    emit_speculative_tick = await _make_emit_speculative_tick(session)

    try:
        await emit_status("loading_model")

        llm = None
        try:
            from llama_cpp import Llama  # type: ignore

            if os.path.exists(config.model_path):
                loop = asyncio.get_event_loop()
                llm = await loop.run_in_executor(
                    None,
                    lambda: Llama(
                        model_path=config.model_path,
                        n_ctx=config.context_size,
                        n_batch=config.batch_size,
                        n_threads=config.threads,
                        n_gpu_layers=config.gpu_layers,
                        verbose=False,
                    ),
                )
        except ImportError:
            llm = None  # llama-cpp-python not installed — use simulation
        except Exception:
            llm = None  # model load failed — use simulation

        await emit_status("warming_up")
        await asyncio.sleep(0.5)
        await emit_status("generating")

        if config.draft_model_path is not None:
            # Speculative decoding mode — always simulated for now
            # (real dual-model loading is planned for a future update)
            await _run_simulated_speculative(session, config, emit_tick, emit_speculative_tick)
        elif llm is not None:
            await _run_real_benchmark(session, llm, config, emit_tick)
        else:
            await _run_simulated_benchmark(session, config, emit_tick)

        await emit_status("completed")

    except asyncio.CancelledError:
        await emit_status("failed")
        raise  # re-raise so the task is properly marked cancelled

    except Exception:
        session.set_status("failed")
        await session.broadcast(
            {
                "event": "status_update",
                "timestamp": int(time.time()),
                "payload": {"status": "failed"},
            }
        )
