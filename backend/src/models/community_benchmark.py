from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from src.services.database import Base


class CommunityBenchmark(Base):
    __tablename__ = "community_benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    gpu_model = Column(String, nullable=False)
    vram_gb = Column(Float, nullable=False)
    os = Column(String, nullable=False)
    framework = Column(String, nullable=False)
    hf_model_id = Column(String, nullable=False)
    quant = Column(String, nullable=False)
    context_window = Column(Integer, nullable=False)
    batch_size = Column(Integer, nullable=False)
    eval_tps = Column(Float, nullable=False)
    prompt_tps = Column(Float, nullable=False)
    run_date = Column(String, nullable=False)          # ISO date string e.g. "2025-04-05"
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
