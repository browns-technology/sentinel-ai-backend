from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Sentinel AI"
    VERSION: str = "4.2.0"
    MODEL_PATH: str = "data/trained_model.pkl"
    
    # CORS - allow your frontend domain
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",  # Allow Vercel domains
        "https://your-domain.com"  # Add your custom domain if you have one
    ]
    
    # Port from environment (Railway sets this)
    PORT: int = int(os.getenv("PORT", 8000))
    
    class Config:
        case_sensitive = True

settings = Settings()