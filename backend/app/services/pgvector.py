from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.message import Message
from app.models.session import Session


async def store_embedding(
    db: AsyncSession,
    message_id: int,
    embedding: list[float],
) -> None:
    """Store an embedding vector for a message."""
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()
    if message:
        message.embedding = embedding
        await db.flush()


async def retrieve_similar_messages(
    db: AsyncSession,
    user_id: int,
    embedding: list[float],
    limit: int = 5,
    exclude_message_id: int | None = None,
) -> list[dict]:
    """
    Find the most semantically similar past messages for this user.
    Uses cosine similarity via pgvector — same pattern as ESG Prism.
    Returns list of {role, content, similarity} dicts.
    """
    params: dict = {
        "embedding": str(embedding),
        "user_id": user_id,
        "limit": limit,
    }

    exclude_clause = ""
    if exclude_message_id:
        exclude_clause = "AND m.id != :exclude_message_id"
        params["exclude_message_id"] = exclude_message_id

    query = text(f"""
        SELECT
            m.id,
            m.role,
            m.content,
            1 - (m.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM messages m
        JOIN sessions s ON m.session_id = s.id
        WHERE s.user_id = :user_id
            AND m.embedding IS NOT NULL
            {exclude_clause}
        ORDER BY m.embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
    """)

    result = await db.execute(query, params)
    rows = result.fetchall()
    return [
        {
            "id": row.id,
            "role": row.role,
            "content": row.content,
            "similarity": round(float(row.similarity), 4),
        }
        for row in rows
    ]