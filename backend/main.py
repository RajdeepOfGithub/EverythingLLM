"""
EverythingLLM Backend API
Hosted on AWS. Handles auth, user profiles, community benchmarks, model metadata.
"""

from fastapi import FastAPI

app = FastAPI(title="EverythingLLM Backend", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}
