# EverythingLLM

> All-in-one platform for planning, benchmarking, and optimizing local LLM inference.

---

## What is this?

EverythingLLM guides you through the full lifecycle of running a large language model locally — from picking the right model, to checking if your hardware can handle it, to benchmarking real throughput, to squeezing out more speed with speculative decoding.

Each module feeds into the next, creating a seamless end-to-end workflow.

---

## Modules

| Module | What it does | Status |
|---|---|---|
| **Model Recommender** | Use case selection + priority sliders (Quality/Speed/Fit/Context) + hardware-aware scoring → ranked model list | ✅ Live |
| **Hardware Planner** | Live VRAM calculator, quant comparison chart, model fit grid, buy-vs-rent cost estimate, side-by-side model comparison | ✅ Live |
| **Throughput Benchmarker** | Connects to local agent, runs real llama.cpp inference, streams live TPS chart via WebSocket. Simulation fallback when no model available. | ✅ Live |
| **Speculative Decoding Advisor** | Recommends draft models, benchmarks target×draft pairs, animated concept explainer | Coming soon |

---

## Architecture

```
[Your Browser]
   React 19 + TypeScript + Vite
   ↕ REST + WebSocket (localhost:7878)
[Your Machine — Local Agent]
   Python + FastAPI
   Hardware detection, llama.cpp lifecycle, benchmark streaming
   ↕ REST (HTTPS)
[AWS Cloud — Backend]
   Python + FastAPI on EC2
   Auth (Cognito), user profiles, community benchmarks (RDS PostgreSQL)
```

The **local agent** runs as a background process on your machine — no data leaves your machine except what you choose to save to the community leaderboard.

---

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Framer Motion, Zustand, custom CSS

**Local Agent:** Python 3.11+, FastAPI, WebSockets, uvicorn

**Backend:** Python 3.11+, FastAPI, SQLAlchemy, PostgreSQL

**Infrastructure:** AWS (EC2, RDS, S3, CloudFront, Cognito, Route 53)

**External APIs:** HuggingFace Hub API

---

## Project Status

| Phase | Status |
|---|---|
| Phase 1: Backbone (infra, auth, frontend↔agent↔backend) | ✅ Complete |
| Phase 2: Model Recommender (wizard, sliders, hardware-aware scoring) | ✅ Complete |
| Phase 3: Hardware Planner (VRAM calc, fit grid, model comparison) | ✅ Complete |
| Phase 4: Throughput Benchmarker (real llama.cpp inference, live WebSocket TPS chart, save to DB) | ✅ Complete |
| Phase 5: Speculative Decoding Advisor | ⏳ Next |
| Phase 6: Dashboard + Community | ⏳ Upcoming |
| Phase 7: Polish + Desktop App (Tauri) | ⏳ Upcoming |

### Live Infrastructure (Phase 1)

| Resource | Value |
|---|---|
| Frontend (CloudFront) | `https://d1z4517js5cwl9.cloudfront.net` |
| Backend (EC2) | `http://100.55.73.90` |
| Auth (Cognito) | `us-east-1_JTfmCRqIP` |

---

## Getting Started

### Frontend
```bash
cd frontend && npm install && npm run dev
```

### Local Agent
```bash
cd agent && pip install -r requirements.txt && python main.py
# Runs on http://localhost:7878
```

### Backend (local dev)
```bash
cd backend && pip install -r requirements.txt
python -m alembic upgrade head
python main.py
# Runs on http://localhost:8000
```

---

## Repository Structure

```
EverythingLLM/
├── frontend/           # React + TypeScript web UI
├── agent/              # Python local agent (runs on your machine)
├── backend/            # Python FastAPI backend (AWS hosted)
├── infrastructure/     # AWS CDK infrastructure definitions
└── shared/
    └── contracts/      # Typed API schemas — source of truth for all layers
```

---

## Contributing

This project is in active development. Contribution guidelines will be added once the core modules are complete.
