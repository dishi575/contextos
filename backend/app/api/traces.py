from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.trace import Trace
from app.models.message import Message
from app.models.session import Session

router = APIRouter(prefix="/traces", tags=["traces"])


# --- Routes ---
@router.get("/{message_id}")
async def get_traces(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """All pipeline traces for a single message — powers the trace timeline."""
    # Verify the message belongs to this user
    result = await db.execute(
        select(Message)
        .join(Session)
        .where(
            Message.id == message_id,
            Session.user_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Message not found")

    result = await db.execute(
        select(Trace)
        .where(Trace.message_id == message_id)
        .order_by(Trace.created_at.asc())
    )
    traces = result.scalars().all()
    return [
        {
            "id": t.id,
            "stage": t.stage,
            "status": t.status,
            "latency_ms": t.latency_ms,
            "tokens_in": t.tokens_in,
            "tokens_out": t.tokens_out,
            "model_used": t.model_used,
            "detail": t.detail,
            "created_at": t.created_at,
        }
        for t in traces
    ]


@router.get("/stats/summary")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate stats for the dashboard — token savings, request count, avg latency."""

    # Token savings from compressor stage
    compression_result = await db.execute(
        select(
            func.sum(Trace.tokens_in - Trace.tokens_out).label("tokens_saved"),
            func.count(Trace.id).label("total_requests"),
        )
        .join(Message)
        .join(Session)
        .where(
            Session.user_id == current_user.id,
            Trace.stage == "compressor",
            Trace.status == "pass",
        )
    )
    compression_row = compression_result.one()

    # Average latency across all LLM calls
    latency_result = await db.execute(
        select(func.avg(Trace.latency_ms).label("avg_latency"))
        .join(Message)
        .join(Session)
        .where(
            Session.user_id == current_user.id,
            Trace.stage == "llm",
        )
    )
    latency_row = latency_result.one()

    # Model usage breakdown for pie chart
    model_result = await db.execute(
        select(Trace.model_used, func.count(Trace.id).label("count"))
        .join(Message)
        .join(Session)
        .where(
            Session.user_id == current_user.id,
            Trace.stage == "llm",
            Trace.model_used.isnot(None),
        )
        .group_by(Trace.model_used)
    )
    model_breakdown = {row.model_used: row.count for row in model_result}

    return {
        "tokens_saved": int(compression_row.tokens_saved or 0),
        "total_requests": int(compression_row.total_requests or 0),
        "avg_latency_ms": round(float(latency_row.avg_latency or 0), 2),
        "model_breakdown": model_breakdown,
    }