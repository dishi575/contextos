from groq import Groq
import asyncio
from app.core.config import get_settings

settings = get_settings()
_client = Groq(api_key=settings.GROQ_API_KEY)

# Available models and what they're good at
GROQ_MODELS = {
    "coding":    "llama-3.3-70b-versatile",
    "reasoning": "llama-3.3-70b-versatile",
    "creative":  "llama-3.1-8b-instant",
    "factual":   "llama-3.1-8b-instant",
    "simple":    "llama-3.1-8b-instant",
}

DEFAULT_MODEL = "llama-3.1-8b-instant"


async def call_groq(
    prompt: str,
    category: str = "factual",
    system_prompt: str = "",
) -> tuple[str, str]:
    """
    Call Groq and return (response_text, model_used).
    Automatically picks the best model for the category.
    """
    model = GROQ_MODELS.get(category, DEFAULT_MODEL)

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: _client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        ),
    )

    text = response.choices[0].message.content
    return text, model


async def call_groq_with_history(
    messages: list[dict],
    category: str = "factual",
) -> tuple[str, str]:
    """
    Call Groq with full conversation history.
    messages: list of {"role": "user"|"assistant"|"system", "content": str}
    """
    model = GROQ_MODELS.get(category, DEFAULT_MODEL)

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: _client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        ),
    )

    text = response.choices[0].message.content
    return text, model