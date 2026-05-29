from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./vulnscan.db"
    JWT_SECRET: str = "change-me-in-production-please"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24
    ML_SERVICE_URL: str = "http://ml:9000"
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"

settings = Settings()
