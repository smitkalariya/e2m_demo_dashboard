class AppError(Exception):
    """Base class for application errors that map to a known HTTP status."""

    status_code = 400

    def __init__(self, message: str, errors: list | dict | None = None):
        self.message = message
        self.errors = errors
        super().__init__(message)


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class UnauthorizedError(AppError):
    status_code = 401


class ForbiddenError(AppError):
    status_code = 403


class BadRequestError(AppError):
    status_code = 400
