from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(
    title="ClarityAI API",
    description="AI-powered forecasting and anomaly detection for business metrics",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Global HTTPException handler
from fastapi import HTTPException
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 404:
        return JSONResponse(status_code=404, content={"error": "Not found"})
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail if exc.detail else exc.status_code})


# 500 handler
@app.exception_handler(Exception)
async def internal_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )

    # ...existing code...
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


from routers import upload, profile

app.include_router(upload.router, tags=["upload"])
app.include_router(profile.router, tags=["profile"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
