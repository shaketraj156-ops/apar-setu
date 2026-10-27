import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger('apaarsetu')


class AppError(Exception):
    status_code = 400
    code = 'BAD_REQUEST'

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        details: Any = None,
        headers: dict | None = None
    ):
        super().__init__(message)
        self.message = message
        self.details = details
        self.headers = headers or {}

        if code:
            self.code = code


class AuthError(AppError):
    status_code = 401
    code = 'UNAUTHENTICATED'


class ForbiddenError(AppError):
    status_code = 403
    code = 'FORBIDDEN'


class NotFoundError(AppError):
    status_code = 404
    code = 'NOT_FOUND'


class ConflictError(AppError):
    status_code = 409
    code = 'CONFLICT'


class PayloadTooLargeError(AppError):
    status_code = 413
    code = 'PAYLOAD_TOO_LARGE'


class UnprocessableError(AppError):
    status_code = 422
    code = 'UNPROCESSABLE'


class RateLimitError(AppError):
    status_code = 429
    code = 'RATE_LIMITED'


def _body(code: str, message: str, details: Any = None) -> dict:
    return {
        'error': {
            'code': code,
            'message': message,
            'details': details
        }
    }


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError):
        headers = dict(exc.headers)

        if exc.status_code == 401:
            headers['WWW-Authenticate'] = 'Bearer'

        return JSONResponse(
            status_code=exc.status_code,
            content=_body(exc.code, exc.message, exc.details),
            headers=headers
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, exc: RequestValidationError):
        details = [
            {
                'field': '.'.join(str(p) for p in e['loc'][1:]),
                'message': e['msg']
            }
            for e in exc.errors()
        ]

        return JSONResponse(
            status_code=422,
            content=_body(
                'VALIDATION_ERROR',
                'Request validation failed',
                details
            )
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(_: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=_body('HTTP_ERROR', str(exc.detail))
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception):
        log.exception('Unhandled error')
        err_msg = str(exc) or type(exc).__name__
        return JSONResponse(
            status_code=500,
            content=_body('INTERNAL_ERROR', err_msg, details=err_msg)
        )
