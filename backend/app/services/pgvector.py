# app/services/pgvector.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
import json
import numpy as np

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
    Supports Postgres (pgvector) and has an in-memory NumPy fallback for SQLite.
    """
    # SQLite Fallback Path
    if db.bind.dialect.name == "sqlite":
        # 1. Fetch user's messages that have embeddings
        result = await db.execute(
            select(Message)
            .join(Session)
            .where(
                Session.user_id == user_id,
                Message.embedding.isnot(None),
            )
        )
        messages = result.scalars().all()
        
        # 2. Exclude current message if needed
        if exclude_message_id:
            messages = [m for m in messages if m.id != exclude_message_id]
            
        if not messages:
            return []

        # 3. Calculate similarity in Python
        similar = []
        target_vec = np.array(embedding)
        
        for m in messages:
            try:
                # Handle potential string vs array serialization differences on SQLite
                if isinstance(m.embedding, str):
                    m_vec = np.array(json.loads(m.embedding))
                else:
                    m_vec = np.array(list(m.embedding))
                    
                if len(m_vec) != len(target_vec):
                    continue
                    
                # Cosine Similarity = dot(A, B) / (norm(A) * norm(B))
                dot_product = np.dot(target_vec, m_vec)
                norm_target = np.linalg.norm(target_vec)
                norm_m = np.linalg.norm(m_vec)
                
                similarity = 0.0 if (norm_target == 0 or norm_m == 0) else dot_product / (norm_target * norm_m)
                
                similar.append({
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "similarity": round(float(similarity), 4),
                })
            except Exception:
                continue
                
        # Sort descending by similarity
        similar.sort(key=lambda x: x["similarity"], reverse=True)
        return similar[:limit]

    # Postgres pgvector Path
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