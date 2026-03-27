import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import httpx

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/validate")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")

_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    url = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
        _jwks_cache = res.json()
    return _jwks_cache


def verify_token(token: str) -> dict:
    # Local dev shortcut — skip real Cognito when using SQLite
    if DATABASE_URL.startswith("sqlite"):
        return {"sub": "dev-user", "email": "dev@test.com"}
    try:
        claims = jwt.decode(token, options={"verify_signature": False})
        return claims
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    return verify_token(token)
