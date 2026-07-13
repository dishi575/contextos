import time
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.gemini import classify_prompt
from app.services.groq import call_groq


async def run_pipeline(
    message: str,
    user: User,
    session_id: int,
    message_id: int,
    db: AsyncSession,
) -> dict:
    """
    Phase 1 stub — runs a minimal pipeline:
    classify → route → llm call → return

    Stages will be replaced one by one in Phase 2 and 3
    with the real guard, memory, compressor, validator and tracer.
    """
    traces = []

    # --- Stage 1: classify the prompt ---
    t0 = time.time()
    category = await classify_prompt(message)
    traces.append({
        "stage": "router",
        "status": "pass",
        "latency_ms": round((time.time() - t0) * 1000, 2),
        "tokens_in": None,
        "tokens_out": None,
        "model_used": "gemini-1.5-flash",
        "detail": {"category": category},
    })

    # --- Stage 2: call the right model ---
    # Respect user's preferred provider
    t0 = time.time()

    if user.preferred_provider == "gemini":
        from app.services.gemini import call_gemini
        response = await call_gemini(
            message,
            model="flash",
        )
        model_used = "gemini-1.5-flash"
    else:
        # Default: groq (faster, generous free tier)
        response, model_used = await call_groq(
            prompt=message,
            category=category,
        )

    traces.append({
        "stage": "llm",
        "status": "pass",
        "latency_ms": round((time.time() - t0) * 1000, 2),
        "tokens_in": None,
        "tokens_out": None,
        "model_used": model_used,
        "detail": {"category": category, "provider": user.preferred_provider},
    })

    return {
        "response": response,
        "traces": traces,
    }