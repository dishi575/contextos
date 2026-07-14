from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
import json

from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.models.user import User

router = APIRouter(tags=["websocket"])

active_connections: dict[int, WebSocket] = {}


async def get_user_from_token(token: str) -> User | None:
    payload = decode_access_token(token)
    if not payload:
        return None
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.id == int(payload.get("sub", 0)))
        )
        return result.scalar_one_or_none()


@router.websocket("/ws/traces")
async def websocket_traces(websocket: WebSocket, token: str):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    active_connections[user.id] = websocket

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        active_connections.pop(user.id, None)


async def push_trace_event(user_id: int, trace: dict) -> None:
    websocket = active_connections.get(user_id)
    if websocket:
        try:
            await websocket.send_text(json.dumps(trace))
        except Exception:
            active_connections.pop(user_id, None)