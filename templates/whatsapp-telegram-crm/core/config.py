# core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # Environment setting
    ENVIRONMENT: str = "development"

    # Meta WhatsApp settings
    VERIFY_TOKEN: str
    WHATSAPP_TOKEN: str
    PHONE_NUMBER_ID: str
    WHATSAPP_API_VERSION: str = "v18.0" # Add a default value

    # Memory settings
    MEMORY_HISTORY_LIMIT: int = 20 # Add a default value

    # N-ATLaS Sovereign AI Settings (OpenAI-compatible)
    NATLAS_BASE_URL: str = "http://localhost:8000/v1"
    NATLAS_API_KEY: str = "natlas-local"
    NATLAS_MODEL: str = "NCAIR1/N-ATLaS"
    
    # N-ATLaS Sovereign Whisper ASR Settings (Yoruba, Hausa, Igbo, English)
    NATLAS_ASR_URL: str = "http://localhost:8001/v1/audio/transcriptions"
    DEFAULT_ASR_LANGUAGE: str = "english" # Options: yoruba, hausa, igbo, english

    # Fallback OpenAI settings (if routing to upstream)
    OPENAI_API_KEY: str = "natlas-local"
    OPENAI_MODEL_NAME: str = "NCAIR1/N-ATLaS"

    # Database (Neon PostgreSQL or fallback SQLite)
    DATABASE_URL: str = "sqlite+aiosqlite:///./whatsapp_agent.db"

    # Telegram settings
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_SECRET: str = ""

    # Security
    INTERNAL_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

@lru_cache()
def get_settings():
    """
    Returns a cached instance of the Settings class.
    Caching ensures the .env file is read only once.
    """
    return Settings()
