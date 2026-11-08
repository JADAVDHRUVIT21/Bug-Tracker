
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.project_members import router as project_members_router
from app.api.v1.endpoints.tickets import router as tickets_router
from app.api.v1.endpoints.comments import router as comments_router
from app.api.v1.endpoints.attachments import router as attachments_router
from app.core.config import settings


app = FastAPI(
    title=settings.APP_NAME,
    description="Bug Tracker API for managing projects, bugs, tasks, and teams.",
    version="1.0.0",
    debug=settings.DEBUG,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/", tags=["General"])
def root():
    return {
        "message": "Bug Tracker API is running",
        "status": "success",
    }


@app.get("/health", tags=["General"])
def health_check():
    return {
        "status": "healthy",
    }


app.include_router(
    auth_router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["Authentication"],
)

app.include_router(
    users_router,
    prefix=f"{settings.API_V1_PREFIX}/users",
    tags=["Users"],
)

app.include_router(
    projects_router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Projects"],
)

app.include_router(
    project_members_router,
    prefix=f"{settings.API_V1_PREFIX}",
    tags=["Project Members"],
)

app.include_router(
    tickets_router,
    prefix=f"{settings.API_V1_PREFIX}/tickets",
    tags=["Tickets"],
)

app.include_router(
    comments_router,
    prefix=f"{settings.API_V1_PREFIX}",
    tags=["Comments"],
)

app.include_router(
    attachments_router,
    prefix=f"{settings.API_V1_PREFIX}/attachments",
    tags=["Attachments"],
)