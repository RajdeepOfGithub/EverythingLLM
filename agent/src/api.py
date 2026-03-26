"""
FastAPI routes and WebSocket endpoints for the local agent.
All routes are served at http://localhost:7878
"""

from fastapi import APIRouter, WebSocket

router = APIRouter()


@router.get("/hardware")
def get_hardware():
    # TODO: return full hardware profile via hardware.py
    pass


@router.get("/models")
def get_models():
    # TODO: return list of local GGUF models via models.py
    pass


@router.post("/benchmark/start")
def start_benchmark(config: dict):
    # TODO: launch benchmark run via server.py, return run_id
    pass


@router.websocket("/metrics/stream")
async def stream_metrics(websocket: WebSocket):
    # TODO: stream live GPU usage, VRAM, temperature, tokens/sec
    pass
