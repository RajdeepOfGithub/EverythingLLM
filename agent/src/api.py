"""
FastAPI routes and WebSocket endpoints for the local agent.
All REST routes served at http://localhost:7878/api/v1
WebSocket served at ws://localhost:7878/ws/metrics/{session_id}
"""

import time
import json
from fastapi import APIRouter, WebSocket
from src.hardware import get_full_hardware_profile
from src.models import scan_for_gguf_models

# REST router — all endpoints under /api/v1
router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/hardware")
def get_hardware():
    return get_full_hardware_profile()


@router.get("/models")
def get_models():
    return scan_for_gguf_models()


@router.post("/benchmark/start")
def start_benchmark(request: dict):
    # Phase 1 stub — llama.cpp integration in Phase 4
    return {"session_id": "stub_session_001", "status": "initializing"}


@router.post("/benchmark/stop")
def stop_benchmark(request: dict):
    return {"stopped": True}


@router.get("/benchmark/status")
def get_benchmark_status(session_id: str = ""):
    return {"session_id": session_id, "status": "completed"}


# WebSocket router — mounted at root (no /api/v1 prefix) per contract
ws_router = APIRouter()


@ws_router.websocket("/ws/metrics/{session_id}")
async def metrics_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    # Phase 1 stub — send one status_update event then close
    event = {
        "event": "status_update",
        "timestamp": int(time.time()),
        "payload": {"status": "completed"},
    }
    await websocket.send_text(json.dumps(event))
    await websocket.close()
