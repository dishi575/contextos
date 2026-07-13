import time
from app.services.groq import call_groq


TOXICITY_SYSTEM = """You are a content safety evaluator. Analyze the given text and respond with ONLY a JSON object in this exact format:
{
  "toxicity_score": 0.0,
  "issues": [],
  "safe": true
}

Where:
- toxicity_score: float between 0.0 (completely safe) and 1.0 (extremely toxic)
- issues: list of strings describing any issues found (empty if none)
- safe: boolean, true if toxicity_score is below threshold

Be strict but fair. Flag hate speech, harassment, dangerous instructions, or harmful content.
Respond with ONLY the JSON, no other text."""


async def run_validator_stage(
    response: str,
    toxicity_threshold: float = 0.7,
) -> tuple[dict, str, bool]:
    """
    Validator stage — checks LLM output for toxicity and safety issues.
    Returns (trace, response, should_block)
    """
    t0 = time.time()

    try:
        raw, _ = await call_groq(
            prompt=f"Evaluate this text for safety:\n\n{response}",
            category="simple",
            system_prompt=TOXICITY_SYSTEM,
        )

        # Parse JSON response
        import json
        clean = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(clean)

        toxicity_score = float(result.get("toxicity_score", 0.0))
        issues = result.get("issues", [])
        should_block = toxicity_score >= toxicity_threshold

        status = "block" if should_block else ("warn" if toxicity_score > 0.3 else "pass")

        trace = {
            "stage": "validator",
            "status": status,
            "latency_ms": round((time.time() - t0) * 1000, 2),
            "tokens_in": None,
            "tokens_out": None,
            "model_used": "llama-3.1-8b-instant",
            "detail": {
                "toxicity_score": toxicity_score,
                "issues": issues,
                "threshold": toxicity_threshold,
                "blocked": should_block,
            },
        }

        blocked_response = "[Response blocked due to safety policy]" if should_block else response
        return trace, blocked_response, should_block

    except Exception as e:
        # Validator failure should never block a response
        trace = {
            "stage": "validator",
            "status": "warn",
            "latency_ms": round((time.time() - t0) * 1000, 2),
            "tokens_in": None,
            "tokens_out": None,
            "model_used": "llama-3.1-8b-instant",
            "detail": {"error": str(e)},
        }
        return trace, response, False