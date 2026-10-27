"""Player account registration and login endpoints."""
import re
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field
from app.services.auth_service import current_user, login_account, register_account

router = APIRouter(prefix="/api/auth", tags=["accounts"])

class RegisterRequest(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=60)
    password: str = Field(min_length=10, max_length=128)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

@router.post("/register")
def register(request: RegisterRequest):
    if not re.search(r"[A-Za-z]", request.password) or not re.search(r"\\d", request.password):
        raise HTTPException(status_code=422, detail="Password must contain at least one letter and one number.")
    return register_account(str(request.email), request.display_name, request.password)

@router.post("/login")
def login(request: LoginRequest):
    return login_account(str(request.email), request.password)

@router.get("/me")
def me(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in to view your account.")
    return current_user(authorization[7:].strip())
