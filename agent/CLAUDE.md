# Local Agent CLAUDE.md

## Scope
This agent works ONLY inside `agent/`. This is a Python process that runs on the user's machine.
Never touch `frontend/`, `backend/`, or `infrastructure/`.

## What This Does
- Detects local hardware (GPU model, VRAM, RAM, CPU) via system tools
- Lists local GGUF model files from common directories
- Launches and manages llama.cpp server processes
- Runs throughput benchmarks and speculative decoding tests
- Streams real-time metrics (VRAM usage, temperature, tokens/sec) via WebSocket
- Exposes everything via a local REST/WebSocket API at `http://localhost:7878`

## Stack
- Python 3.11+
- FastAPI (local API server)
- WebSockets (for live metric streaming)
- `nvidia-smi`, `/proc/meminfo`, `lscpu` for hardware detection

## Folder Structure
```
src/
├── hardware.py   # Hardware detection (GPU, RAM, CPU)
├── models.py     # Local GGUF model file discovery
├── server.py     # llama.cpp server lifecycle management
└── api.py        # FastAPI routes and WebSocket endpoints
```

## Key Commands
<!-- To be filled -->

## Conventions
<!-- To be filled -->
