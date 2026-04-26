"""Inject 'not financial advice' metadata into all responses."""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

DISCLAIMER = "This is not investment advice. All portfolios are simulated. Past performance does not guarantee future results."


class DisclaimerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Disclaimer"] = DISCLAIMER
        return response
