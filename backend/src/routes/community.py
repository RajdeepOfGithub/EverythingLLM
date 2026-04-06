from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from src.services.database import get_db
from src.models.community_benchmark import CommunityBenchmark

router = APIRouter(prefix="/api/v1/community", tags=["community"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class CommunityBenchmarkCreate(BaseModel):
    gpu_model: str
    vram_gb: float
    os: str
    framework: str
    hf_model_id: str
    quant: str
    context_window: int
    batch_size: int
    eval_tps: float
    prompt_tps: float
    run_date: str  # ISO date string e.g. "2025-04-05"

    @field_validator("eval_tps")
    @classmethod
    def eval_tps_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("eval_tps must be greater than 0")
        return v

    @field_validator("prompt_tps")
    @classmethod
    def prompt_tps_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("prompt_tps must be greater than 0")
        return v


class CommunityBenchmarkRead(BaseModel):
    id: int
    gpu_model: str
    vram_gb: float
    os: str
    framework: str
    hf_model_id: str
    quant: str
    context_window: int
    batch_size: int
    eval_tps: float
    prompt_tps: float
    run_date: str
    submitted_at: datetime

    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _row_to_read(row: CommunityBenchmark) -> CommunityBenchmarkRead:
    return CommunityBenchmarkRead.model_validate(row)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/benchmarks")
def submit_community_benchmark(
    body: CommunityBenchmarkCreate,
    db: Session = Depends(get_db),
) -> dict:
    row = CommunityBenchmark(
        gpu_model=body.gpu_model,
        vram_gb=body.vram_gb,
        os=body.os,
        framework=body.framework,
        hf_model_id=body.hf_model_id,
        quant=body.quant,
        context_window=body.context_window,
        batch_size=body.batch_size,
        eval_tps=body.eval_tps,
        prompt_tps=body.prompt_tps,
        run_date=body.run_date,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_read(row).model_dump()


@router.get("/benchmarks")
def list_community_benchmarks(
    db: Session = Depends(get_db),
) -> list:
    rows = (
        db.query(CommunityBenchmark)
        .order_by(CommunityBenchmark.submitted_at.desc())
        .all()
    )
    return [_row_to_read(r).model_dump() for r in rows]
