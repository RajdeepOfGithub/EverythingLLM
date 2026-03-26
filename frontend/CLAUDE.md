# Frontend CLAUDE.md

## Scope
This agent works ONLY inside `frontend/`. Never touch `agent/`, `backend/`, or `infrastructure/`.

## Stack
- React 19 + TypeScript
- Vite (build tool)
- CSS (no framework, custom styles)

## Local Agent Communication
The frontend talks to the local agent at `http://localhost:7878`.
- If agent is unreachable → fall back to manual input mode
- Use REST for commands, WebSocket for live metrics streaming

## Backend Communication
The frontend talks to the hosted backend API.
- Base URL stored in env variable: `VITE_API_BASE_URL`
- Auth tokens via AWS Cognito

## Folder Structure
```
src/
├── components/   # Reusable UI components
├── pages/        # One file per route/page
├── hooks/        # Custom React hooks
├── utils/        # Pure helper functions
├── types/        # TypeScript interfaces and types
└── assets/       # Static assets
```

## Key Commands
<!-- To be filled -->

## Conventions
<!-- To be filled -->
