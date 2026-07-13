import re
import time

# PII patterns — Indian context aware
PII_PATTERNS = {
    "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    "phone": r"\b(?:\+91[\s-]?)?[6-9]\d{9}\b",
    "aadhaar": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
    "pan": r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
    "credit_card": r"\b(?:\d{4}[\s-]?){3}\d{4}\b",
    "ip_address": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
}

# Prompt injection patterns
INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions?",
    r"disregard\s+(?:all\s+)?(?:previous|above|prior)\s+instructions?",
    r"you\s+are\s+now\s+(?:a\s+)?(?:dan|jailbreak|unrestricted)",
    r"act\s+as\s+(?:if\s+you\s+(?:are|were)\s+)?(?:an?\s+)?(?:evil|unrestricted|unfiltered)",
    r"forget\s+(?:all\s+)?(?:your\s+)?(?:previous\s+)?(?:instructions?|training|rules?)",
    r"system\s*:\s*you\s+are",
    r"\[system\]",
    r"<\s*system\s*>",
]


def mask_pii(text: str) -> tuple[str, list[str]]:
    """Detect and mask PII in text. Returns (masked_text, list of found types)."""
    found = []
    masked = text

    for pii_type, pattern in PII_PATTERNS.items():
        matches = re.findall(pattern, masked, re.IGNORECASE)
        if matches:
            found.append(pii_type)
            masked = re.sub(
                pattern,
                f"[{pii_type.upper()}_REDACTED]",
                masked,
                flags=re.IGNORECASE,
            )

    return masked, found


def detect_injection(text: str) -> list[str]:
    """Detect prompt injection attempts. Returns list of matched patterns."""
    found = []
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            found.append(pattern[:30])
    return found


async def run_guard_stage(
    message: str,
    pii_masking_enabled: bool = True,
) -> tuple[dict, str, bool]:
    """
    Guard stage — scans for PII and prompt injection.
    Returns (trace, cleaned_message, should_block)
    """
    t0 = time.time()

    blocked = False
    pii_found = []
    injection_found = []
    cleaned = message

    # Check for prompt injection first — block immediately if found
    injection_found = detect_injection(message)
    if injection_found:
        blocked = True

    # Mask PII if enabled and not already blocking
    if pii_masking_enabled and not blocked:
        cleaned, pii_found = mask_pii(message)

    status = "block" if blocked else ("warn" if pii_found else "pass")

    trace = {
        "stage": "guard",
        "status": status,
        "latency_ms": round((time.time() - t0) * 1000, 2),
        "tokens_in": None,
        "tokens_out": None,
        "model_used": None,
        "detail": {
            "pii_found": pii_found,
            "injection_detected": bool(injection_found),
            "pii_masking_enabled": pii_masking_enabled,
            "blocked": blocked,
        },
    }

    return trace, cleaned, blocked