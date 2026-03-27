from fastapi import APIRouter

router = APIRouter(prefix="/speculative", tags=["speculative"])


@router.get("/recommendations")
def get_recommendations(target_model: str = "", vram_gb: float = 0):
    return []
