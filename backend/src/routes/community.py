from fastapi import APIRouter

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/leaderboard")
def get_leaderboard():
    return []
