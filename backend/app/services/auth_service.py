"""Account registration and signed bearer-token helpers."""
import base64, hashlib, hmac, os, secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select
from app.db import SessionLocal
from app.models.user import UserAccount

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def _secret() -> bytes:
    value = os.getenv("AUTH_TOKEN_SECRET", "").strip()
    if not value: raise RuntimeError("AUTH_TOKEN_SECRET must be configured before account authentication is enabled.")
    return value.encode()

def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return "scrypt$" + _b64(salt) + "$" + _b64(digest)

def _matches(password: str, stored: str) -> bool:
    try:
        algorithm, salt_text, digest_text = stored.split("$", 2)
        if algorithm != "scrypt": return False
        salt = base64.urlsafe_b64decode(salt_text + "=" * (-len(salt_text) % 4))
        expected = base64.urlsafe_b64decode(digest_text + "=" * (-len(digest_text) % 4))
        actual = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=len(expected))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError): return False

def _token(user: UserAccount) -> str:
    expiry = int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())
    payload = user.user_id + "." + str(expiry)
    signature = hmac.new(_secret(), payload.encode(), hashlib.sha256).digest()
    return _b64(payload.encode()) + "." + _b64(signature)

def _response(user: UserAccount) -> dict:
    return {"access_token": _token(user), "token_type": "bearer", "user": {"user_id": user.user_id, "email": user.email, "display_name": user.display_name}}

def register_account(email: str, display_name: str, password: str) -> dict:
    normalized = email.strip().lower()
    with SessionLocal() as db:
        if db.scalar(select(UserAccount).where(UserAccount.email == normalized)):
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        user = UserAccount(user_id=str(uuid4()), email=normalized, display_name=display_name.strip(), password_hash=_hash_password(password))
        db.add(user)
        try: db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status_code=409, detail="Could not create account. Check whether this email is already registered.")
        db.refresh(user)
        return _response(user)

def login_account(email: str, password: str) -> dict:
    with SessionLocal() as db:
        user = db.scalar(select(UserAccount).where(UserAccount.email == email.strip().lower()))
        if user is None or not _matches(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Email or password is incorrect.")
        return _response(user)

def current_user(token: str) -> dict:
    try:
        payload_text, signature_text = token.split(".", 1)
        payload = base64.urlsafe_b64decode(payload_text + "=" * (-len(payload_text) % 4)).decode()
        user_id, expiry_text = payload.rsplit(".", 1)
        signature = base64.urlsafe_b64decode(signature_text + "=" * (-len(signature_text) % 4))
        expected = hmac.new(_secret(), payload.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected) or int(expiry_text) < int(datetime.now(timezone.utc).timestamp()): raise ValueError
    except (ValueError, TypeError, UnicodeDecodeError):
        raise HTTPException(status_code=401, detail="Your sign-in has expired. Please sign in again.")
    with SessionLocal() as db:
        user = db.get(UserAccount, user_id)
        if user is None: raise HTTPException(status_code=401, detail="Account not found.")
        return {"user_id": user.user_id, "email": user.email, "display_name": user.display_name}
