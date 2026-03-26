"""
EverythingLLM Local Agent
Runs on the user's machine at http://localhost:7878
Handles hardware detection, model discovery, and benchmark execution.
"""

from fastapi import FastAPI

app = FastAPI(title="EverythingLLM Agent", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=7878)
