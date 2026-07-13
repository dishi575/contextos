from fastapi import APIRouter
from app.core.config import get_settings

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "0.1.0",
    }