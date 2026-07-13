from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from app.models.trace import Trace


async def write_traces(
    db: AsyncSession,
    message_id: int,
    traces: list[dict],
) -> None:
    """
    Persist all pipeline stage traces to the DB.
    Called once at the end of the pipeline after all stages complete.
    """
    for t in traces:
        trace = Trace(
            message_id=message_id,
            stage=t["stage"],
            status=t["status"],
            latency_ms=t.get("latency_ms"),
            tokens_in=t.get("tokens_in"),
            tokens_out=t.get("tokens_out"),
            model_used=t.get("model_used"),
            detail=t.get("detail"),
        )
        db.add(trace)

    await db.flush()