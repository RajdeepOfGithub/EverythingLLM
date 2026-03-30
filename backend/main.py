"""
EverythingLLM Backend API
Hosted on AWS. Handles auth, user profiles, community benchmarks, model metadata.
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import auth, user, models, benchmarks, community, speculative

app = FastAPI(title="EverythingLLM Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(models.router)
app.include_router(benchmarks.router)
app.include_router(community.router)
app.include_router(speculative.router)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
