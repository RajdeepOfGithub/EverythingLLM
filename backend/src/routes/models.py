from fastapi import APIRouter, Depends
from src.services.auth import get_current_user

router = APIRouter(prefix="/models", tags=["models"])


@router.post("/save")
def save_model_stack(body: dict, user: dict = Depends(get_current_user)):
    return {"saved": True, "stack_id": "stub-stack-001"}


@router.get("/saved")
def get_saved_stack(user: dict = Depends(get_current_user)):
    return None
