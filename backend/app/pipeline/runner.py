import time
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.groq import call_groq
from app.pipeline.memory import run_memory_stage
from app.pipeline.compressor import run_compressor_stage


async def classify_with_groq(message: str) -> str:
    """Classify prompt category using Groq."""
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

    # --- Stage 1: Memory — embed + retrieve ---
    memory_trace, similar_messages = await run_memory_stage(
        db=db,
        user_id=user.id,
        message_id=message_id,
        message=message,
        max_chunks=user.max_memory_chunks,
    )
    traces.append(memory_trace)

    # --- Stage 2: Compressor — trim context to token budget ---
    compressor_trace, context = await run_compressor_stage(
        message=message,
        similar_messages=similar_messages,
        token_budget=user.token_budget,
    )
    traces.append(compressor_trace)

    # --- Stage 3: Router — classify prompt ---
    t0 = time.time()
    category = await classify_with_groq(message)
    traces.append({
        "stage": "router",
        "status": "pass",
        "latency_ms": round((time.time() - t0) * 1000, 2),
        "tokens_in": None,
        "tokens_out": None,
        "model_used": "llama-3.1-8b-instant",
        "detail": {"category": category},
    })

    # --- Stage 4: LLM call — with memory context injected ---
    t0 = time.time()

    # Build the full prompt with context
    if context:
        full_prompt = f"""Here is relevant context from previous conversation:
{context}

Current message: {message}"""
    else:
        full_prompt = message

    if user.preferred_provider == "gemini":
        from app.services.gemini import call_gemini
        response = await call_gemini(full_prompt, model="flash")
        model_used = "gemini-2.0-flash"
    else:
        response, model_used = await call_groq(
            prompt=full_prompt,
            category=category,
        )

    traces.append({
        "stage": "llm",
        "status": "pass",
        "latency_ms": round((time.time() - t0) * 1000, 2),
        "tokens_in": None,
        "tokens_out": None,
        "model_used": model_used,
        "detail": {
            "category": category,
            "provider": user.preferred_provider,
            "context_injected": bool(context),
        },
    })

    return {
        "response": response,
        "traces": traces,
    }