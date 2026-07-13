from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

router = APIRouter(tags=["websocket"])

# Active connections store — maps user_id to their WebSocket connection
active_connections: dict[int, WebSocket] = {}


async def get_user_from_token(token: str, db: AsyncSession) -> User | None:
    """Validate JWT from WebSocket query param."""
    payload = decode_access_token(token)
    if not payload:
        return None
    result = await db.execute(
        select(User).where(User.id == int(payload.get("sub", 0)))
    )
    return result.scalar_one_or_none()


@router.websocket("/ws/traces")
async def websocket_traces(
    websocket: WebSocket,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint — client connects with JWT token as query param.
    Receives live trace events as each pipeline stage completes.
    Usage: ws://localhost:8000/ws/traces?token=YOUR_JWT
    """
    user = await get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    active_connections[user.id] = websocket

    try:
        # Keep connection alive — client can send pings
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        active_connections.pop(user.id, None)


async def push_trace_event(user_id: int, trace: dict) -> None:
    """
    Called by the pipeline runner after each stage completes.
    Pushes the trace event to the user's active WebSocket connection.
    """
    websocket = active_connections.get(user_id)
    if websocket:
        try:
            await websocket.send_text(json.dumps(trace))
        except Exception:
            # Connection may have dropped — remove it silently
            active_connections.pop(user_id, None)