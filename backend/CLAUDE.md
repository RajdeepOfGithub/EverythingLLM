# Backend CLAUDE.md

## Scope
This agent works ONLY inside `backend/`. This is the AWS-hosted API server.
Never touch `frontend/`, `agent/`, or `infrastructure/`.

## What This Does
- User auth (AWS Cognito integration)
- Stores and serves user hardware profiles
- Community benchmark database (submit, retrieve, leaderboard)
- Proxies HuggingFace Hub API for model metadata/search
- Stores saved benchmark results per user

## Stack
- Python 3.11+
- FastAPI
- PostgreSQL (AWS RDS)
- AWS Cognito (auth)
- AWS Lambda or EC2 (deployment)

## Folder Structure
```
src/
├── routes/     # API route handlers (one file per feature area)
├── models/     # Database models (SQLAlchemy)
└── services/   # Business logic layer
```

## Key Commands
<!-- To be filled -->

## Conventions
<!-- To be filled -->
