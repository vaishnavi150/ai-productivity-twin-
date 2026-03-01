from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time

from app.config import settings
from app.database import create_tables
from app.routers import auth, logs, dashboard, insights

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info(f"Starting {settings.APP_NAME}...")
    create_tables()
    logger.info("Database tables verified/created")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered productivity tracking and burnout prediction system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ─── Middleware ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(process_time)
    return response


# ─── Exception Handlers ───────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


# ─── Routers ──────────────────────────────────────────────────────────
PREFIX = settings.API_V1_PREFIX

app.include_router(auth.router, prefix=PREFIX)
app.include_router(logs.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(insights.router, prefix=PREFIX)


# ─── Health Check ─────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": "/health",
    }
