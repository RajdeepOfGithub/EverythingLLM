from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/validate")
def validate_token(body: dict):
    # Phase 1 stub — real Cognito validation wired after CDK provisioning
    return {"valid": True, "user_id": "dev-user"}
