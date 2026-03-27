from sqlalchemy import Column, Integer, String, Text
from src.services.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    cognito_sub = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=False)
    created_at = Column(String, nullable=False)       # ISO 8601
    hardware_profile = Column(Text, nullable=True)    # JSON serialized as string
