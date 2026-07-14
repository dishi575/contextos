from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.session import Session
from app.models.message import Message

router = APIRouter(prefix="/chat", tags=["chat"])


async def generate_session_title(message: str) -> str:
    """Generate a clean, brief 3-5 word title for a new conversation session using Groq."""
    try:
        from app.services.groq import call_groq
        system = (
            "You are a conversation title generator. Summarize the user's first prompt "
            "into a very brief 3-5 word title. Do not use quotes, punctuation, or explanations. "
            "Respond with ONLY the summarized title words."
        )
        title, _ = await call_groq(prompt=message, category="simple", system_prompt=system)
        clean_title = title.strip().replace('"', '').replace("'", "").replace(".", "")
        return clean_title[:60]
    except Exception:
        return message[:60]


# --- Schemas ---
class ChatRequest(BaseModel):
    message: str
    session_id: int | None = None


class TraceItem(BaseModel):
    stage: str
    status: str
    latency_ms: float | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    model_used: str | None = None
    detail: dict | None = None


class ChatResponse(BaseModel):
    response: str
    session_id: int
    message_id: int
    traces: list[TraceItem] = []


# --- Routes ---
@router.post("/", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Get or create session
    if body.session_id:
        result = await db.execute(
            select(Session).where(
                Session.id == body.session_id,
                Session.user_id == current_user.id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        title = await generate_session_title(body.message)
        session = Session(
            user_id=current_user.id,
            title=title,
        )
        db.add(session)
        await db.flush()

    # 2. Save user message
    user_msg = Message(
        session_id=session.id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    await db.flush()

    # 3. Run through pipeline
    # Phase 1: direct call — pipeline stages added in Phase 2 and 3
    from app.pipeline.runner import run_pipeline
    result = await run_pipeline(
        message=body.message,
        user=current_user,
        session_id=session.id,
        message_id=user_msg.id,
        db=db,
    )

    # 4. Save assistant response
    assistant_msg = Message(
        session_id=session.id,
        role="assistant",
        content=result["response"],
    )
    db.add(assistant_msg)
    await db.flush()

    return ChatResponse(
        response=result["response"],
        session_id=session.id,
        message_id=user_msg.id,
        traces=result["traces"],
    )


@router.get("/sessions")
async def get_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id)
        .order_by(Session.created_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify session belongs to user
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.user_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at,
        }
        for m in messages
    ]


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    return {"message": "Session deleted"}