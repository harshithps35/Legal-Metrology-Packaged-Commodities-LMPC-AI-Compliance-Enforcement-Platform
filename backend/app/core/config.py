"""
LMPC Compliance System — Core Configuration

Loads environment variables and provides application-wide settings.
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


# Project root paths
BASE_DIR = Path(__file__).resolve().parent.parent
RULES_DIR = BASE_DIR / "rules"
UPLOADS_DIR = BASE_DIR.parent / "uploads"


def resolve_image_path(image_url_or_path: Optional[str]) -> Optional[Path]:
    """Safely resolves an image path or URL to an existing local filesystem Path."""
    if not image_url_or_path:
        return None
    
    clean = str(image_url_or_path).replace("\\", "/").strip()
    
    # 1. Direct path check
    direct = Path(clean)
    if direct.exists() and direct.is_file():
        return direct.resolve()
        
    filename = Path(clean).name
    # 2. Check in UPLOADS_DIR
    target = (UPLOADS_DIR / filename).resolve()
    if target.exists() and target.is_file():
        return target
        
    # 3. Check in relative uploads folder
    rel = Path("uploads") / filename
    if rel.exists() and rel.is_file():
        return rel.resolve()
        
    return None


def normalize_image_url(image_path_or_url: Optional[str]) -> str:
    """Normalizes any image path or string to a valid Web URL starting with /uploads/."""
    if not image_path_or_url:
        return "/uploads/artwork_sample.png"
    
    raw = str(image_path_or_url).strip()
    if raw.startswith("[") and raw.endswith("]"):
        try:
            import json
            parsed = json.loads(raw)
            if isinstance(parsed, list) and len(parsed) > 0:
                raw = str(parsed[0]).strip()
        except Exception:
            import re
            m = re.search(r'["\']([^"\']+\.(?:png|jpg|jpeg|webp|gif))["\']', raw, re.IGNORECASE)
            if m:
                raw = m.group(1)

    clean = raw.replace("\\", "/").replace('"', '').replace("'", "").replace("[", "").replace("]", "").strip()
    if clean.startswith("http://") or clean.startswith("https://") or clean.startswith("blob:") or clean.startswith("data:"):
        return clean
    if clean.startswith("./"):
        clean = clean[2:]
    if not clean.startswith("/"):
        clean = "/" + clean
    if not clean.startswith("/uploads/"):
        filename = Path(clean).name
        clean = f"/uploads/{filename}"
    return clean



class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # --- App ---
    APP_NAME: str = "LMPC Compliance System"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # --- API ---
    API_PREFIX: str = "/api/v1"

    # --- Database ---
    DATABASE_URL: str = "sqlite+aiosqlite:///./lmpc.db"

    # --- Auth / JWT ---
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # --- OCR ---
    OCR_ENGINE: str = "tesseract"  # "tesseract" | "google_vision"
    TESSERACT_CMD: str = "tesseract"  # Path to tesseract binary
    TESSERACT_LANG: str = "hin+eng"  # Multilingual by default
    GOOGLE_VISION_API_KEY: str = ""

    # --- Font Measurement ---
    DEFAULT_CALIBRATION_TIER: str = "relative"  # "relative" | "calibrated"
    FONT_TOLERANCE_PERCENT: float = 10.0

    # --- Storage ---
    UPLOAD_DIR: str = str(UPLOADS_DIR)
    MAX_UPLOAD_SIZE_MB: int = 20

    # --- Rules ---
    RULES_FILE: str = str(RULES_DIR / "rules_lmpc.json")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton — call this instead of instantiating Settings directly."""
    return Settings()
