from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Trace(Base):
    __tablename__ = "traces"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)

    # Which pipeline stage wrote this trace
    stage = Column(String, nullable=False)
    # "pass" | "warn" | "block"
    status = Column(String, nullable=False)

    latency_ms = Column(Float, nullable=True)
    tokens_in = Column(Integer, nullable=True)
    tokens_out = Column(Integer, nullable=True)
    model_used = Column(String, nullable=True)

    # Stage-specific metadata — flexible JSON bucket
    detail = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    message = relationship("Message", back_populates="traces")