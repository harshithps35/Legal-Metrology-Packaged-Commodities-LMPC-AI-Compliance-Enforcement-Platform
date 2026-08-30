"""
LMPC Compliance System — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address
    SLOWAPI_AVAILABLE = True
except ImportError:
    SLOWAPI_AVAILABLE = False
    Limiter = None
    _rate_limit_exceeded_handler = None
    RateLimitExceeded = None
    get_remote_address = None

from app.core.config import get_settings
from app.core.database import init_db


settings = get_settings()
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"]) if SLOWAPI_AVAILABLE else None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle — initializes DB tables on startup."""
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Automated compliance verification system for packaged commodities "
        "under the Legal Metrology (Packaged Commodities) Rules, 2011."
    ),
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files — serve uploaded packaging images
from app.core.config import UPLOADS_DIR
from fastapi.staticfiles import StaticFiles

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# Rate limiting — prevent brute-force login and upload flooding
if SLOWAPI_AVAILABLE:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ---------- Health Check ----------

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# ---------- Route Registration ----------

from app.api.routes import auth, scan, dashboard, reports, super_admin, products
from app.api.routes.supervisor import router as supervisor_router
from app.api.routes.inspector import router as inspector_router
from app.api.routes.employer import router as employer_router
from app.api.routes.field_visits.router import router as field_visits_router
from app.api.routes.commissioner.router import router as commissioner_router
from app.api.routes.sub_inspector.router import router as sub_inspector_router

app.include_router(auth.router,              prefix=settings.API_PREFIX)
app.include_router(scan.router,              prefix=settings.API_PREFIX)
app.include_router(dashboard.router,         prefix=settings.API_PREFIX)
app.include_router(reports.router,           prefix=settings.API_PREFIX)
app.include_router(super_admin.router,       prefix=settings.API_PREFIX)
app.include_router(supervisor_router,        prefix=settings.API_PREFIX)
app.include_router(inspector_router,         prefix=settings.API_PREFIX)
app.include_router(employer_router,          prefix=settings.API_PREFIX)
app.include_router(field_visits_router,      prefix=settings.API_PREFIX)
app.include_router(commissioner_router,      prefix=settings.API_PREFIX)
app.include_router(sub_inspector_router,     prefix=settings.API_PREFIX)
app.include_router(products.router,          prefix=settings.API_PREFIX)
