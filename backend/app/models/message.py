from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    role = Column(String, nullable=False)        # "user" | "assistant"
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="messages")
    traces = relationship("Trace", back_populates="message", cascade="all, delete-orphan")