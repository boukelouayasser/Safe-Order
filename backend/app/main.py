"""
Safe Order — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth, orders, payments, tracking, feedback, stats, admin, demo
from app.seed import seed_initial_data, seed_demo_data
from app.database import SessionLocal

# Create all tables on startup (dev convenience — Alembic for prod)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plateforme de sécurisation des commandes e-commerce en Algérie",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
if settings.CORS_ALLOW_ALL:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(tracking.router, prefix="/api/tracking", tags=["Tracking"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

if settings.DEMO_MODE:
    app.include_router(demo.router, prefix="/api/demo", tags=["Demo Shortcuts"])


@app.on_event("startup")
def on_startup():
    """Seed reference data and demo accounts on startup."""
    db = SessionLocal()
    try:
        seed_initial_data(db)
        if settings.DEMO_MODE:
            seed_demo_data(db)
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "demo_mode": settings.DEMO_MODE,
    }


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
        "health": "/api/health",
    }
