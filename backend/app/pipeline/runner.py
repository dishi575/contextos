import time
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.groq import call_groq
from app.pipeline.guard import run_guard_stage
from app.pipeline.memory import run_memory_stage
from app.pipeline.compressor import run_compressor_stage
from app.pipeline.validator import run_validator_stage
from app.pipeline.tracer import write_traces
from app.api.websocket import push_trace_event


async def classify_with_groq(message: str) -> str:
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

    # --- Stage 1: Guard ---
    guard_trace, cleaned_message, blocked = await run_guard_stage(
        message=message,
        pii_masking_enabled=user.pii_masking_enabled,
    )
    traces.append(guard_trace)
    await push_trace_event(user.id, guard_trace)

    if blocked:
        await write_traces(db, message_id, traces)
        return {
            "response": "Your request was blocked by the security policy.",
            "traces": traces,
        }

    # --- Stage 2: Memory ---
    memory_trace, similar_messages = await run_memory_stage(
        db=db,
        user_id=user.id,
        message_id=message_id,
        message=cleaned_message,
        max_chunks=user.max_memory_chunks,
    )
    traces.append(memory_trace)
    await push_trace_event(user.id, memory_trace)

    # --- Stage 3: Compressor ---
    compressor_trace, context = await run_compressor_stage(
        message=cleaned_message,
        similar_messages=similar_messages,
        token_budget=user.token_budget,
    )
    traces.append(compressor_trace)
    await push_trace_event(user.id, compressor_trace)

    # --- Stage 4: Router ---
    t0 = time.time()
    category = await classify_with_groq(cleaned_message)
    router_trace = {
        "stage": "router",
        "status": "pass",
        "latency_ms": round((time.time() - t0) * 1000, 2),
        "tokens_in": None,
        "tokens_out": None,
        "model_used": "llama-3.1-8b-instant",
        "detail": {"category": category},
    }
    traces.append(router_trace)
    await push_trace_event(user.id, router_trace)

    # --- Stage 5: LLM ---
    t0 = time.time()

    if context:
        full_prompt = f"""Here is relevant context from previous conversation:
{context}

Current message: {cleaned_message}"""
    else:
        full_prompt = cleaned_message

    if user.preferred_provider == "gemini":
        from app.services.gemini import call_gemini
        response = await call_gemini(full_prompt, model="flash")
        model_used = "gemini-2.0-flash"
    else:
        response, model_used = await call_groq(
            prompt=full_prompt,
            category=category,
        )

    llm_trace = {
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
    }
    traces.append(llm_trace)
    await push_trace_event(user.id, llm_trace)

    # --- Stage 6: Validator ---
    validator_trace, final_response, _ = await run_validator_stage(
        response=response,
        toxicity_threshold=user.toxicity_threshold,
    )
    traces.append(validator_trace)
    await push_trace_event(user.id, validator_trace)

    # --- Stage 7: Write all traces to DB ---
    await write_traces(db, message_id, traces)

    return {
        "response": final_response,
        "traces": traces,
    }