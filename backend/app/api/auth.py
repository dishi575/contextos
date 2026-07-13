from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_api_key,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# --- Schemas ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PolicyUpdateRequest(BaseModel):
    token_budget: int | None = None
    temperature: float | None = None
    toxicity_threshold: float | None = None
    max_memory_chunks: int | None = None
    pii_masking_enabled: bool | None = None
    preferred_provider: str | None = None


class UserResponse(BaseModel):
    id: int
    email: str
    api_key: str | None
    token_budget: int
    temperature: float
    toxicity_threshold: float
    max_memory_chunks: int
    pii_masking_enabled: bool
    preferred_provider: str

    class Config:
        from_attributes = True


# --- Dependency: get current user from JWT ---
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(
        select(User).where(User.id == int(payload.get("sub", 0)))
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# --- Routes ---
@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        api_key=generate_api_key(),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/policy", response_model=UserResponse)
async def update_policy(
    body: PolicyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's pipeline policy config — maps to the settings sliders."""
    if body.token_budget is not None:
        if not 500 <= body.token_budget <= 8000:
            raise HTTPException(status_code=400, detail="token_budget must be 500–8000")
        current_user.token_budget = body.token_budget

    if body.temperature is not None:
        if not 0.0 <= body.temperature <= 1.0:
            raise HTTPException(status_code=400, detail="temperature must be 0.0–1.0")
        current_user.temperature = body.temperature

    if body.toxicity_threshold is not None:
        if not 0.0 <= body.toxicity_threshold <= 1.0:
            raise HTTPException(status_code=400, detail="toxicity_threshold must be 0.0–1.0")
        current_user.toxicity_threshold = body.toxicity_threshold

    if body.max_memory_chunks is not None:
        if not 1 <= body.max_memory_chunks <= 10:
            raise HTTPException(status_code=400, detail="max_memory_chunks must be 1–10")
        current_user.max_memory_chunks = body.max_memory_chunks

    if body.pii_masking_enabled is not None:
        current_user.pii_masking_enabled = body.pii_masking_enabled

    if body.preferred_provider is not None:
        if body.preferred_provider not in {"auto", "groq", "gemini"}:
            raise HTTPException(status_code=400, detail="provider must be auto, groq or gemini")
        current_user.preferred_provider = body.preferred_provider

    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.post("/regenerate-api-key", response_model=UserResponse)
async def regenerate_api_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.api_key = generate_api_key()
    await db.flush()
    await db.refresh(current_user)
    return current_user