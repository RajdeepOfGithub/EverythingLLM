from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from src.services.database import Base


class Benchmark(Base):
    __tablename__ = "benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    model_id = Column(String, nullable=False)
    config = Column(Text, nullable=False)             # JSON serialized
    results = Column(Text, nullable=False)            # JSON serialized
    is_speculative = Column(Boolean, default=False)
    draft_model_id = Column(String, nullable=True)
    created_at = Column(String, nullable=False)       # ISO 8601
    share_url = Column(String, nullable=False)
