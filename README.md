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
| **Model Recommender** | Use case selection + quality/speed/fit/context sliders + hardware-aware scoring → ranked model list | ✅ Live |
| **Hardware Planner** | VRAM/RAM calculator, quantization fit grid, buy-vs-rent cost estimate | Coming soon |
| **Throughput Benchmarker** | Runs live llama.cpp sweeps on your machine, streams real-time heatmaps | Coming soon |
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
| Phase 2: Model Recommender | 🔄 In progress |
| Phase 3: Hardware Planner | ⏳ Upcoming |
| Phase 4: Throughput Benchmarker | ⏳ Upcoming |
| Phase 5: Speculative Decoding Advisor | ⏳ Upcoming |
| Phase 6: Dashboard + Community | ⏳ Upcoming |
| Phase 7: Polish + Desktop App (Tauri) | ⏳ Upcoming |

**Phase 2 progress:**
- 3-step wizard: use case selection → preference sliders → ranked model results
- Hardware-aware scoring with VRAM fit check via local agent
- Retro terminal theme: VT323 + Space Mono, `#FFE600` accents, CRT scanlines
- Public landing page with typewriter hero and animated pipeline overview
- Segmented VRAM bar, AnimatePresence step transitions, staggered card reveals

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

This project is in early development. Contribution guidelines will be added once the core modules are complete.
