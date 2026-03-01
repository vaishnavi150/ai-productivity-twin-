from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List, Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Productivity Twin"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:Vaish%40584@localhost:5432/productivity_twin"

    # Auth
    SECRET_KEY: str = "change-me-in-production-use-32-char-minimum"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AWS
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "productivity-twin-models"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
