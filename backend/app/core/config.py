from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ContextOS"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # AI Providers
    GEMINI_API_KEY: str
    GROQ_API_KEY: str

    # Pipeline config
    DEFAULT_TOKEN_BUDGET: int = 2000
    MAX_MEMORY_CHUNKS: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()