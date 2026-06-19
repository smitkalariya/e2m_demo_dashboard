from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError
from app.core.responses import success_response
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserLogin, UserPublic, UserRegister
from app.services.auth_service import AuthService, TokenPair

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


def _set_auth_cookies(response: Response, tokens: TokenPair) -> None:
    secure = settings.environment != "development"
    response.set_cookie(
        ACCESS_COOKIE,
        tokens.access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        tokens.refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")


async def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(session))


@router.post("/register", status_code=201)
async def register(data: UserRegister, service: AuthService = Depends(get_auth_service)):
    user = await service.register(data)
    return success_response(
        data=UserPublic.model_validate(user).model_dump(mode="json"),
        message="User registered successfully",
        status_code=201,
    )


@router.post("/login")
async def login(data: UserLogin, service: AuthService = Depends(get_auth_service)):
    user = await service.authenticate(data)
    tokens = service.issue_tokens(user)
    # Cookies must be set on the Response we actually return — FastAPI discards
    # mutations made on an injected `Response` dependency once a handler returns
    # its own Response instance (which success_response() does).
    response = success_response(
        data=UserPublic.model_validate(user).model_dump(mode="json"), message="Login successful"
    )
    _set_auth_cookies(response, tokens)
    return response


@router.post("/refresh")
async def refresh(request: Request, service: AuthService = Depends(get_auth_service)):
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if not refresh_token:
        raise UnauthorizedError("Refresh token missing")

    tokens = await service.refresh(refresh_token)
    response = success_response(message="Token refreshed")
    _set_auth_cookies(response, tokens)
    return response


@router.post("/logout")
async def logout(request: Request, service: AuthService = Depends(get_auth_service)):
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if refresh_token:
        await service.logout(refresh_token)
    response = success_response(message="Logged out successfully")
    _clear_auth_cookies(response)
    return response


@router.get("/profile")
async def profile(current_user: User = Depends(get_current_user)):
    return success_response(data=UserPublic.model_validate(current_user).model_dump(mode="json"))
