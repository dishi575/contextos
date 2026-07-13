import asyncio
import google.generativeai as genai
from app.core.config import get_settings

settings = get_settings()
genai.configure(api_key=settings.GEMINI_API_KEY)

_flash = genai.GenerativeModel("gemini-2.0-flash")
_pro = genai.GenerativeModel("gemini-2.0-flash")

EMBEDDING_MODEL = "gemini-embedding-001"


async def call_gemini(
    prompt: str,
    model: str = "flash",
    system_prompt: str = "",
) -> str:
    m = _pro if model == "pro" else _flash
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None, lambda: m.generate_content(full_prompt)
    )
    return response.text


async def get_embedding(text: str) -> list[float]:
    """Get embedding using gemini-embedding-001."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document",
        ),
    )
    return result["embedding"]


async def classify_prompt(prompt: str) -> str:
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