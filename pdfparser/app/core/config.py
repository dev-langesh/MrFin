import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Bank Statement PDF Parser"
    API_V1_STR: str = "/api/v1"
    
    # File Storage
    UPLOAD_DIR: Path = Path("/tmp/pdfparser_uploads")
    MAX_UPLOAD_SIZE: int = 20 * 1024 * 1024  # 20MB
    
    # Extraction Config
    MIN_ROWS_FOR_TABLE: int = 3
    
    class Config:
        env_file = ".env"

settings = Settings()

# Ensure upload directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
