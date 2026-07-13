import time
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(enc.encode(text))


def compress_context(
    message: str,
    similar_messages: list[dict],
    token_budget: int,
) -> tuple[str, int, int, int]:
    """
    Builds a context string from retrieved memory chunks,
    trimming to fit within the token budget.

    Returns (context_string, tokens_before, tokens_after, chunks_used)
    """
    if not similar_messages:
        return "", 0, 0, 0

    full_chunks = []
    for msg in similar_messages:
        prefix = "User" if msg["role"] == "user" else "Assistant"
        full_chunks.append(f"{prefix}: {msg['content']}")

    full_context = "\n".join(full_chunks)
    tokens_before = count_tokens(full_context)

    message_tokens = count_tokens(message)
    available = token_budget - message_tokens - 200

    if available <= 0:
        return "", tokens_before, 0, 0

    if tokens_before <= available:
        return full_context, tokens_before, tokens_before, len(full_chunks)

    trimmed_chunks = []
    used_tokens = 0

    for chunk in full_chunks:
        chunk_tokens = count_tokens(chunk)
        if used_tokens + chunk_tokens > available:
            break
        trimmed_chunks.append(chunk)
        used_tokens += chunk_tokens

    trimmed_context = "\n".join(trimmed_chunks)
    tokens_after = count_tokens(trimmed_context)

    return trimmed_context, tokens_before, tokens_after, len(trimmed_chunks)


async def run_compressor_stage(
    message: str,
    similar_messages: list[dict],
    token_budget: int,
) -> tuple[dict, str]:
    t0 = time.time()

    context, tokens_in, tokens_out, chunks_used = compress_context(
        message=message,
        similar_messages=similar_messages,
        token_budget=token_budget,
    )

    tokens_saved = tokens_in - tokens_out
    compression_ratio = round(tokens_out / tokens_in, 2) if tokens_in > 0 else 1.0

    trace = {
        "stage": "compressor",
        "status": "pass",
        "latency_ms": round((time.time() - t0) * 1000, 2),
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "model_used": None,
        "detail": {
            "tokens_saved": tokens_saved,
            "compression_ratio": compression_ratio,
            "chunks_used": chunks_used,
        },
    }

    return trace, context