from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.api.cases import router as cases_router
from app.api.interrogation import router as interrogation_router
from app.api.sessions import router as sessions_router

app = FastAPI(title="AI Detective V3 API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
        "game": "AI Detective",
        "status": "online",
        "version": "3.0.0",
        "phase": "persistent sessions",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
