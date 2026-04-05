"""
FastAPI routes and WebSocket endpoints for the local agent.
All REST routes served at http://localhost:7878/api/v1
WebSocket served at ws://localhost:7878/ws/metrics/{session_id}
"""

import asyncio
import json
import time
from typing import Optional

from fastapi import APIRouter, WebSocket
from pydantic import BaseModel

from src.hardware import get_full_hardware_profile
from src.models import scan_for_gguf_models

# REST router — all endpoints under /api/v1
router = APIRouter(prefix="/api/v1")


# ---------------------------------------------------------------------------
# Unchanged endpoints
# ---------------------------------------------------------------------------

@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/hardware")
def get_hardware():
    return get_full_hardware_profile()


@router.get("/models")
def get_models():
    return scan_for_gguf_models()


# ---------------------------------------------------------------------------
# Benchmark request/response models
# ---------------------------------------------------------------------------

class BenchmarkStartBody(BaseModel):
    model_path: str
    draft_model_path: Optional[str] = None
    context_size: int = 4096
    batch_size: int = 512
    threads: int = 4
    gpu_layers: int = 0


class BenchmarkStopBody(BaseModel):
    session_id: str


# ---------------------------------------------------------------------------
# Benchmark REST endpoints
# ---------------------------------------------------------------------------

@router.post("/benchmark/start", status_code=202)
async def start_benchmark(body: BenchmarkStartBody):
    from src.server import session_manager, run_benchmark, BenchmarkConfig

    config = BenchmarkConfig(
        model_path=body.model_path,
        draft_model_path=body.draft_model_path,
        context_size=body.context_size,
        batch_size=body.batch_size,
        threads=body.threads,
        gpu_layers=body.gpu_layers,
    )
    session = session_manager.create(config)

    loop = asyncio.get_event_loop()
    task = loop.create_task(run_benchmark(session))
    session.task = task

    return {"session_id": session.session_id, "status": "initializing"}


@router.post("/benchmark/stop")
async def stop_benchmark(body: BenchmarkStopBody):
    from src.server import session_manager

    session = session_manager.get(body.session_id)
    if session is None:
        return {"stopped": False, "reason": "session_not_found"}

    if session.task is not None and not session.task.done():
        session.task.cancel()
        try:
            await session.task
        except asyncio.CancelledError:
            pass

    return {"stopped": True}


@router.get("/benchmark/status")
def get_benchmark_status(session_id: str = ""):
    from src.server import session_manager

    session = session_manager.get(session_id)
    if session is None:
        return {"session_id": session_id, "status": "failed"}

    return {"session_id": session_id, "status": session.status}


# ---------------------------------------------------------------------------
# WebSocket router — mounted at root (no /api/v1 prefix) per contract
# ---------------------------------------------------------------------------

ws_router = APIRouter()


@ws_router.websocket("/ws/metrics/{session_id}")
async def metrics_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()

    from src.server import session_manager

    # Wait up to 5 seconds for the session to be registered
    # (the WS client may connect before the POST handler finishes creating it)
    session = None
    for _ in range(50):
        session = session_manager.get(session_id)
        if session:
            break
        await asyncio.sleep(0.1)

    if session is None:
        await websocket.close(code=1008)
        return

    queue = session.subscribe()

    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                await websocket.send_text(json.dumps(event))

                # Close the socket once a terminal state is reached
                if event.get("event") == "status_update":
                    status = event.get("payload", {}).get("status", "")
                    if status in ("completed", "failed"):
                        break

            except asyncio.TimeoutError:
                # No events for 30 s — the benchmark has likely stalled
                break

    except Exception:
        pass

    finally:
        await websocket.close()
