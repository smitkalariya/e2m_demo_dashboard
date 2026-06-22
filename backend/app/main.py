from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging, get_logger
from app.core.responses import error_response
from app.middleware.rate_limit import RateLimitMiddleware

settings = get_settings()
configure_logging("DEBUG" if settings.environment == "development" else "INFO")
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up (environment=%s)", settings.environment)
    yield
    logger.info("Shutting down")


app = FastAPI(title="E2M Customer Success Platform API", lifespan=lifespan)

# Order matters: middleware added later wraps the ones added earlier, so CORS
# (added last) stays outermost and decorates even 429 responses from the rate
# limiter with the right headers.
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return error_response(message=exc.message, errors=exc.errors, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return error_response(message="Validation failed", errors=exc.errors(), status_code=422)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return error_response(message="Internal server error", status_code=500)


@app.get("/health")
def health():
    return {"status": "healthy"}


app.include_router(api_router, prefix=settings.api_v1_prefix)
