from fastapi import APIRouter

from app.api.v1 import admin, auth, map as mapa, reports, review, surveys

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(reports.router)
api_router.include_router(mapa.router)
api_router.include_router(review.router)
api_router.include_router(surveys.router)
api_router.include_router(admin.router)
