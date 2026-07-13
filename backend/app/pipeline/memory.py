import time
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.gemini import get_embedding
from app.services.pgvector import store_embedding, retrieve_similar_messages


async def run_memory_stage(
    db: AsyncSession,
    user_id: int,
    message_id: int,
    message: str,
    max_chunks: int = 5,
) -> dict:
    """
    Memory stage — two jobs:
    1. Embed the current message and store it
    2. Retrieve the most relevant past messages as context
    """
    t0 = time.time()
    result = {
        "stage": "memory",
        "status": "pass",
        "tokens_in": None,
        "tokens_out": None,
        "model_used": "text-embedding-004",
        "detail": {},
    }

    try:
        # Step 1: embed current message and store it
        embedding = await get_embedding(message)
        await store_embedding(db, message_id, embedding)

        # Step 2: retrieve similar past messages
        similar = await retrieve_similar_messages(
            db=db,
            user_id=user_id,
            embedding=embedding,
            limit=max_chunks,
            exclude_message_id=message_id,
        )

        result["detail"] = {
            "chunks_retrieved": len(similar),
            "top_similarity": similar[0]["similarity"] if similar else 0,
        }
        result["latency_ms"] = round((time.time() - t0) * 1000, 2)

        return result, similar

    except Exception as e:
        # Memory failure should never block the response
        result["status"] = "warn"
        result["detail"] = {"error": str(e)}
        result["latency_ms"] = round((time.time() - t0) * 1000, 2)
        return result, []