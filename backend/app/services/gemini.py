import asyncio
import google.generativeai as genai
from app.core.config import get_settings

settings = get_settings()
genai.configure(api_key=settings.GEMINI_API_KEY)

# Model instances — configured once at import, reused across requests
_flash = genai.GenerativeModel("gemini-2.0-flash")
_pro = genai.GenerativeModel("gemini-2.0-flash")

EMBEDDING_MODEL = "models/text-embedding-004"


async def call_gemini(
    prompt: str,
    model: str = "flash",
    system_prompt: str = "",
) -> str:
    """
    Call Gemini and return the text response.
    model: "flash" (fast, cheap) | "pro" (slower, smarter)
    """
    m = _pro if model == "pro" else _flash
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

    # Gemini SDK is sync — run in thread pool to keep FastAPI non-blocking
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None, lambda: m.generate_content(full_prompt)
    )
    return response.text


async def get_embedding(text: str) -> list[float]:
    """
    Get a 768-dimensional embedding vector for a piece of text.
    Used by the memory stage to store and retrieve relevant context.
    """
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: genai.embed_content(model=EMBEDDING_MODEL, content=text),
    )
    return result["embedding"]


async def classify_prompt(prompt: str) -> str:
    """
    Classify a prompt into a category for model routing.
    Returns one of: coding | reasoning | creative | factual | simple
    """
    system = """You are a prompt classifier. Classify the user prompt into exactly one category:
- coding: writing, debugging, or explaining code
- reasoning: math, logic, multi-step problems, analysis  
- creative: stories, poems, brainstorming, ideation
- factual: questions with a direct factual answer
- simple: greetings, very short or trivial requests

Reply with only the category word, nothing else."""

    result = await call_gemini(prompt, model="flash", system_prompt=system)
    category = result.strip().lower()
    valid = {"coding", "reasoning", "creative", "factual", "simple"}
    return category if category in valid else "factual"