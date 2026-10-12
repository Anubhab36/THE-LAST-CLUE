
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.api.cases import router as cases_router
from app.api.interrogation import router as interrogation_router
from app.api.sessions import router as sessions_router

app = FastAPI(title="THE LAST CLUE API", version="3.0.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "").strip().rstrip("/")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if frontend_origin:
    allowed_origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router)
app.include_router(interrogation_router)
app.include_router(sessions_router)


@app.get("/")
def root():
    return {
        "game": "THE LAST CLUE",
        "status": "online",
        "version": "3.0.0",
        "phase": "persistent sessions",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
