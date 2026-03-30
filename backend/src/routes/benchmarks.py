from fastapi import APIRouter, Depends, HTTPException
from src.services.auth import get_current_user

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])


@router.post("/save")
def save_benchmark(body: dict, user: dict = Depends(get_current_user)):
    return {"id": "stub-bench-001", "share_url": "/benchmarks/stub-bench-001"}


@router.get("/history")
def get_history(user: dict = Depends(get_current_user)):
    return []


@router.get("/{benchmark_id}")
def get_benchmark(benchmark_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=404, detail="Benchmark not found")
