from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)

    # --- Pipeline policy config (user-controlled) ---
    token_budget = Column(Integer, default=2000)        # 500–8000
    temperature = Column(Float, default=0.7)            # 0.0–1.0
    toxicity_threshold = Column(Float, default=0.7)     # 0.0–1.0 (higher = stricter)
    max_memory_chunks = Column(Integer, default=5)      # 1–10
    pii_masking_enabled = Column(Boolean, default=True)
    preferred_provider = Column(String, default="auto") # "auto" | "groq" | "gemini"

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")