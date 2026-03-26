# EverythingLLM — Root CLAUDE.md

## Project Overview
All-in-one LLM tooling platform. Helps users go from zero to optimized LLM inference:
Model Selection → Hardware Planning → Throughput Benchmarking → Speculative Decoding Optimization.

## Repo Structure
```
EverythingLLM/
├── frontend/        # React + TypeScript web UI (Vite)
├── agent/           # Python local agent (runs on user's machine, detects hardware, runs benchmarks)
├── backend/         # FastAPI backend (AWS hosted, handles auth, community DB, model metadata)
├── infrastructure/  # AWS CDK infrastructure definitions
└── Docs/            # Versioned documentation
    └── Docs_V1/     # Initial architecture and planning docs
```

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite
- **Local Agent:** Python 3.11+, FastAPI (local server at localhost:7878)
- **Backend:** FastAPI, AWS Lambda / EC2, PostgreSQL (RDS), AWS Cognito (auth)
- **Infrastructure:** AWS CDK
- **External APIs:** HuggingFace Hub API (model metadata)

## Modules (in order of user journey)
1. **Model Selector** — search/filter models via HuggingFace API, auto-fill specs
2. **Hardware Planner** — VRAM/RAM calculator with buy-vs-rent cost estimate
3. **Throughput Benchmarker** — connects to local agent, runs llama.cpp sweeps, visual results
4. **Speculative Decoding Advisor** — draft model recommendations, live benchmarking

## Development Phases
See `Docs/Docs_V1/phases.md`

## Key Commands
<!-- To be filled as project is set up -->

## Coding Conventions
<!-- To be filled -->

## Current Status
- Folder structure created ✅
- Template files + code stubs created ✅
- GitHub repo created (public): EverythingLLM ✅
- GitHub MCP fine-grained token set via `docker mcp secret set GITHUB_PERSONAL_ACCESS_TOKEN` ✅
- Docs/Docs_V1 templates created ✅
- **Next step:** Verify GitHub MCP connection → push initial structure to repo → start filling Docs_V1

## Important Decisions Made
- Web UI + local agent first → Tauri desktop app in Phase 7
- AWS for all hosting (S3 + CloudFront for frontend, EC2/Lambda for backend, RDS for DB, Cognito for auth)
- Fine-grained GitHub token scoped to EverythingLLM repo only
- Versioned docs: Docs/Docs_V1/, Docs/Docs_V2/ etc — update on every major change
- CLAUDE.md files at: root, frontend/, agent/, backend/
- n8n: optional, only if a clear automation need arises
- No Electron — use Tauri for desktop wrapper when the time comes
- HuggingFace Hub API for model metadata (not self-maintained)

## Development Phases
1. Backbone (infra, auth, frontend↔agent↔backend connections)
2. Model Selector
3. Hardware Planner
4. Throughput Benchmarker
5. Speculative Decoding Advisor
6. Dashboard + Community features
7. Polish + Tauri desktop app

## GitHub Workflow
- Push to repo at end of each completed phase
- Use branches per phase/feature (e.g. `phase/1-backbone`, `feat/model-selector`)
- Never push directly to main

## Do Not
- Don't push directly to main
- Don't use Electron (use Tauri)
- Don't use a UI framework for styling (custom CSS only)
- Don't create classic GitHub tokens (use fine-grained, repo-scoped)
- Don't write wall-of-text docs — always use tables, diagrams, and visual structure
