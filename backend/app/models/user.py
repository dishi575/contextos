from sqlalchemy import Column, String, Boolean, DateTime, Integer, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)

    # Per-user pipeline policy
    token_budget = Column(Integer, default=2000)
    pii_masking_enabled = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")