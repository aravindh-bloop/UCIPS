import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, budget, clusters, complaints, ping, phone, projects

app = FastAPI(title="UCIPS Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.storage_dir, exist_ok=True)
app.mount("/storage", StaticFiles(directory=settings.storage_dir), name="storage")

app.include_router(ping.router)
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(phone.router)
app.include_router(clusters.router)
app.include_router(projects.router)
app.include_router(budget.router)
