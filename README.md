# EverythingLLM

> All-in-one platform for planning, benchmarking, and optimizing local LLM inference.

---

## What is this?

EverythingLLM guides you through the full lifecycle of running a large language model locally — from picking the right model, to checking if your hardware can handle it, to benchmarking real throughput, to squeezing out more speed with speculative decoding.

Each module feeds into the next, creating a seamless end-to-end workflow.

---

## Modules

| Module | What it does |
|---|---|
| **Model Selector** | Search HuggingFace Hub, filter by use case, auto-fill specs downstream |
| **Hardware Planner** | VRAM/RAM calculator, quantization fit grid, buy-vs-rent cost estimate |
| **Throughput Benchmarker** | Runs live llama.cpp sweeps on your machine, streams real-time heatmaps |
| **Speculative Decoding Advisor** | Recommends draft models, benchmarks target×draft pairs, shows speedup |

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

The **local agent** runs as a background process on your machine and is what makes real hardware detection and benchmarking possible — no data leaves your machine except what you choose to save to the community leaderboard.

---

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, custom CSS

**Local Agent:** Python 3.11+, FastAPI, WebSockets, uvicorn

**Backend:** Python 3.11+, FastAPI, SQLAlchemy, PostgreSQL

**Infrastructure:** AWS (EC2, RDS, S3, CloudFront, Cognito, Route 53)

**External APIs:** HuggingFace Hub API

---

## Project Status

Currently in active development — **Phase 1 (Backbone)** in progress.

| Phase | Status |
|---|---|
| Phase 1: Backbone (infra, auth, connections) | 🔄 In progress |
| Phase 2: Model Selector | ⏳ Upcoming |
| Phase 3: Hardware Planner | ⏳ Upcoming |
| Phase 4: Throughput Benchmarker | ⏳ Upcoming |
| Phase 5: Speculative Decoding Advisor | ⏳ Upcoming |
| Phase 6: Dashboard + Community | ⏳ Upcoming |
| Phase 7: Polish + Desktop App (Tauri) | ⏳ Upcoming |

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

This project is in early development. Contribution guidelines will be added once the backbone is complete.
