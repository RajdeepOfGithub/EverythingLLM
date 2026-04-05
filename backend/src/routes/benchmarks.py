from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any
import json
import uuid
from datetime import datetime, timezone

from src.services.auth import get_current_user
from src.services.database import get_db
from src.models.benchmark import Benchmark
from src.models.user import User

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class BenchmarkConfig(BaseModel):
    threads: int
    parallel: int
    context_size: int
    batch_size: int
    gpu_layers: int


class BenchmarkResults(BaseModel):
    peak_eval_tps: float
    peak_prompt_tps: float
    best_threads: int
    best_parallel: int
    sweep_data: Any  # arbitrary JSON blob


class SaveBenchmarkRequest(BaseModel):
    model_id: str
    config: BenchmarkConfig
    results: BenchmarkResults
    is_speculative: bool = False
    draft_model_id: str | None = None


class BenchmarkSummaryResponse(BaseModel):
    id: str
    model_id: str
    peak_eval_tps: float
    created_at: str
    share_url: str


class BenchmarkDetailResponse(BenchmarkSummaryResponse):
    config: BenchmarkConfig
    results: BenchmarkResults
    is_speculative: bool
    draft_model_id: str | None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_create_user(db: Session, user_claims: dict) -> User:
    sub = user_claims.get("sub", "dev-user")
    user = db.query(User).filter(User.cognito_sub == sub).first()
    if not user:
        user = User(
            cognito_sub=sub,
            email=user_claims.get("email", ""),
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def _row_to_summary(row: Benchmark) -> BenchmarkSummaryResponse:
    results_data = json.loads(row.results)
    return BenchmarkSummaryResponse(
        id=str(row.id),
        model_id=row.model_id,
        peak_eval_tps=results_data.get("peak_eval_tps", 0.0),
        created_at=row.created_at,
        share_url=row.share_url,
    )


def _row_to_detail(row: Benchmark) -> BenchmarkDetailResponse:
    config_data = json.loads(row.config)
    results_data = json.loads(row.results)
    return BenchmarkDetailResponse(
        id=str(row.id),
        model_id=row.model_id,
        peak_eval_tps=results_data.get("peak_eval_tps", 0.0),
        created_at=row.created_at,
        share_url=row.share_url,
        config=BenchmarkConfig(**config_data),
        results=BenchmarkResults(**results_data),
        is_speculative=row.is_speculative,
        draft_model_id=row.draft_model_id,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/save")
def save_benchmark(
    body: SaveBenchmarkRequest,
    user_claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user = _get_or_create_user(db, user_claims)

    share_id = uuid.uuid4().hex[:12]
    share_url = f"/benchmarks/{share_id}"

    results_payload = body.results.model_dump()
    # sweep_data is already included in model_dump; no special handling needed

    row = Benchmark(
        user_id=user.id,
        model_id=body.model_id,
        config=json.dumps(body.config.model_dump()),
        results=json.dumps(results_payload),
        is_speculative=body.is_speculative,
        draft_model_id=body.draft_model_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        share_url=share_url,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {"id": str(row.id), "share_url": row.share_url}


@router.get("/history")
def get_history(
    user_claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    user = _get_or_create_user(db, user_claims)
    rows = (
        db.query(Benchmark)
        .filter(Benchmark.user_id == user.id)
        .order_by(Benchmark.id.desc())
        .limit(50)
        .all()
    )
    return [_row_to_summary(r).model_dump() for r in rows]


@router.get("/{benchmark_id}")
def get_benchmark(
    benchmark_id: str,
    user_claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    row = None

    # Try integer primary key first
    try:
        row = db.query(Benchmark).filter(Benchmark.id == int(benchmark_id)).first()
    except ValueError:
        pass

    # Fall back to share_url fragment match
    if not row:
        row = (
            db.query(Benchmark)
            .filter(Benchmark.share_url.contains(benchmark_id))
            .first()
        )

    if not row:
        raise HTTPException(status_code=404, detail="Benchmark not found")

    return _row_to_detail(row).model_dump()
