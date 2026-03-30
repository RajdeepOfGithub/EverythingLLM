from fastapi import APIRouter, Depends
from src.services.auth import get_current_user

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile")
def get_profile(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["sub"],
        "email": user.get("email", ""),
        "created_at": "2026-01-01T00:00:00Z",
        "hardware_profile": None,
    }


@router.post("/hardware-profile")
def save_hardware_profile(body: dict, user: dict = Depends(get_current_user)):
    # Phase 1 stub — DB write wired in Phase 2
    return {"saved": True}
