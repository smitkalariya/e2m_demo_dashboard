from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.cache_service import CacheService
from app.core.responses import success_response
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.dashboard import DashboardRepository
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def get_dashboard_service(session: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(DashboardRepository(session), CacheService())


@router.get("/metrics")
async def get_metrics(
    _: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    metrics = await service.get_metrics()
    return success_response(data=metrics.model_dump(mode="json"))
