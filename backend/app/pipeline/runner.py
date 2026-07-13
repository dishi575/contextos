import time
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.groq import call_groq


async def classify_with_groq(message: str) -> str:
    """Classify prompt category using Groq instead of Gemini."""
    system = """You are a prompt classifier. Classify the user prompt into exactly one category:
- coding: writing, debugging, or explaining code
- reasoning: math, logic, multi-step problems, analysis
- creative: stories, poems, brainstorming, ideation
- factual: questions with a direct factual answer
- simple: greetings, very short or trivial requests

Reply with only the category word, nothing else."""

    response, _ = await call_groq(
        prompt=message,
        category="simple",
        system_prompt=system,
    )
    category = response.strip().lower()
    valid = {"coding", "reasoning", "creative", "factual", "simple"}
    return category if category in valid else "factual"


async def run_pipeline(
    message: str,
    user: User,
    session_id: int,
    message_id: int,
    db: AsyncSession,
) -> dict:
    traces = []

    # --- Stage 1: classify via Groq ---
    t0 = time.time()
    category = await classify_with_groq(message)
    traces.append({
        "stage": "router",
        "status": "pass",
        "latency_ms": round((time.time() - t0) * 1000, 2),
        "tokens_in": None,
        "tokens_out": None,
        "model_used": "llama3-8b-8192",
        "detail": {"category": category},
    })

    # --- Stage 2: call the right model ---
    t0 = time.time()

    if user.preferred_provider == "gemini":
        from app.services.gemini import call_gemini
        response = await call_gemini(message, model="flash")
        model_used = "gemini-2.0-flash"
    else:
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